import Guilds, {
    IAlias,
    IGuildDoc,
    IConfigDoc,
    IAliasDoc,
    ILink,
    ILinkDoc,
    IMovie,
    IMovieDoc,
    IMovieContainerDoc,
    IAutoDeleteElement,
    IAutoDeleteElementDoc,
    IAutoDeleteSpecified,
    ISoundDoc,
    IMovieRequest,
    IMovieRequestDoc,
    IMovieDownloadElement,
    IMovieDownloadElementDoc,
} from '../models/guildModel'
import { MongooseUpdateQuery, UpdateQuery } from 'mongoose'
import {
    findOrCreateResponse,
    uniqueArrayObject,
    updateOneResponse,
    updateOneResponseHandler,
    updateOneResponseHandlerResponse,
    updateOneStrings,
} from '../db.util'
import _, { over, reject } from 'lodash'
import { keywords, NumberConstants } from '../../util/constants'
import { MessageEmbed, Guild as GuildD } from 'discord.js'
import { sendToChannel, MessageChannel, Prompt } from '../../util/messageUtil'
import { stringMatch } from '../../util/stringUtil'
import moment from 'moment-timezone'
import { EmojiUtil, MovieUtil } from '../../util/generalUtil'
import { Schema } from 'mongoose'
import { time } from 'console'
export namespace Guild {
    export async function initializeGuild(guildID: string): Promise<findOrCreateResponse> {
        // making my own findorcreate here as
        // there is no good type definition

        return new Promise((resolve, reject) => {
            const query = { guild_id: guildID }
            Guilds.findOne(query)
                .then((data: IGuildDoc | null) => {
                    if (data) {
                        resolve({
                            created: false,
                            message: 'Already exists',
                            doc: data,
                        })
                    } else {
                        //   need to make it
                        // all the config is set up in the mongoose thing so I don't want to redo it here
                        //@ts-ignore
                        Guilds.create({ guild_id: guildID })
                            .then((createData: IGuildDoc) => {
                                resolve({
                                    created: true,
                                    message: `${guildID} has been created.`,
                                    doc: createData,
                                })
                            })
                            .catch((error: Error) => {
                                reject(error)
                            })
                    }
                })
                .catch((error: Error) => {
                    reject(error)
                })
        })
    }

    export function getGuild(guildID: string, overrideQuery?: any): Promise<IGuildDoc> {
        return new Promise((resolve, reject) => {
            const query = overrideQuery ? overrideQuery : { guild_id: guildID }
            Guilds.findOne(query)
                .exec()
                .then((guildDoc) => {
                    if (guildDoc == null) {
                        reject(undefined)
                        return
                    } else {
                        resolve(guildDoc)
                    }
                })
                .catch((error) => {
                    console.error(error)
                })
        })
    }

    export async function deleteGuild(guildID: string): Promise<boolean> {
        try {
            await Guilds.deleteOne({ guild_id: guildID })
            return true
        } catch (error) {
            throw error
        }
    }
}

export namespace Alias {
    export interface IAliasNoName {
        id: string
        type: string
    }

    export enum Types {
        user = 'user',
        voice = 'voice',
        text = 'text',
    }

    export interface createAliasResponse {
        response: updateOneResponse
        approvedAliases: string[]
        rejectedAliases: string[]
    }

    export function createAlias(
        guildID: string,
        { id, type }: IAliasNoName,
        names: string[],
        textChannel?: MessageChannel
    ): Promise<createAliasResponse> {
        return new Promise((resolve, reject) => {
            let resolveObj: createAliasResponse
            const strings = {
                success: `Alias for ${id} has been created`,
                failure: `Alias for ${id} has not been created`,
            }

            Guild.getGuild(guildID)
                .then((guildDoc) => {
                    const aliases = guildDoc.aliases

                    const { approved, rejected } = uniqueArrayObject(aliases, names, 'name')

                    if (textChannel) {
                        const msg = new MessageEmbed()

                        if (approved.length > 0) msg.addField('Approved Aliases', approved.join('\n'), false)
                        if (rejected.length > 0) msg.addField('Rejected Aliases', rejected.join('\n'), false)

                        sendToChannel(textChannel, msg, true, 30 * NumberConstants.secs)
                    }

                    if (approved.length == 0) {
                        if (textChannel) sendToChannel(textChannel, 'No approved aliases. Nothing will be added.', true)

                        const z: createAliasResponse = {
                            response: { n: 1, nModified: 0, ok: 1 },
                            approvedAliases: [],
                            rejectedAliases: names,
                        }
                        resolve(z)
                        return
                    }

                    const alias_objs = approved.map((new_name) => {
                        const z: UpdateQuery<IAlias> = {
                            name: new_name,
                            id: id,
                            type: type,
                        }
                        return z
                    })

                    const query: MongooseUpdateQuery<IGuildDoc> = {
                        //@ts-ignore
                        $push: {
                            //@ts-ignore
                            aliases: alias_objs,
                        },
                    }

                    Guilds.updateOne({ guild_id: guildID }, query).then((x: updateOneResponse) => {
                        updateOneResponseHandler(x, strings, textChannel)
                        resolveObj = {
                            response: x,
                            approvedAliases: approved,
                            rejectedAliases: rejected,
                        }
                        resolve(resolveObj)
                    })
                })
                .catch((error) => {
                    console.log(error)
                    reject(error)
                })
        })
    }

    export function lookupAlias(guildID: string, alias: string): Promise<IAliasDoc | undefined> {
        return new Promise((resolve, reject) => {
            const aliasRegex = stringMatch(alias, {
                loose: true,
                trimInput: true,
                insensitive: true,
            })
            Guild.getGuild(guildID)
                .then((guildDoc) => {
                    const aliases = guildDoc?.aliases

                    if (aliases.length > 0) {
                        resolve(aliases.find((x) => aliasRegex.test(x.name)))
                    } else {
                        resolve(undefined)
                    }
                })
                .catch((error) => {
                    console.log(error)
                    reject(error)
                })
        })
    }

    export interface getAliasesByIDResponse {
        aliases: IAliasDoc[]
        messageSent: boolean
    }
    export async function getAliasesByID(
        guildID: string,
        id: string,
        textChannel?: MessageChannel
    ): Promise<getAliasesByIDResponse> {
        try {
            const guildDoc = await Guild.getGuild(guildID)
            const aliases = guildDoc.aliases

            let idAliases: IAliasDoc[] = []
            let messageSent: boolean = false
            let msg: string | MessageEmbed

            if (aliases.length > 0) {
                idAliases = aliases.filter((x) => x.id == id)
            } else {
                let content: string = idAliases.map((x) => x.name).join('\n')
                msg = new MessageEmbed().addField(`Aliases for id: ${id}`, content, true)
            }
            msg = 'There are no aliases for this id'

            if (textChannel) {
                await sendToChannel(textChannel, msg, true, 1 * NumberConstants.mins)
                messageSent = true
            }

            return { aliases: idAliases, messageSent: messageSent }
        } catch (error) {
            throw error
        }
    }

    export function deleteAliases(
        guildID: string,
        aliases: IAliasDoc | IAliasDoc[],
        textChannel?: MessageChannel
    ): Promise<updateOneResponse> {
        return new Promise((resolve, reject) => {
            let deleteIDs: any[] = []
            let deleteNames: string[] = []
            if (Array.isArray(aliases)) {
                aliases.forEach((x) => {
                    deleteIDs.push(x._id)
                    deleteNames.push(x.name)
                })
            } else {
                deleteIDs.push(aliases._id)
                deleteNames.push(aliases.name)
            }
            const updateStrings: updateOneStrings = {
                success: `The following ids have been deleted: ${deleteNames.join(', ')}`,
                failure: 'There was an error deleting the aliases. Please try again or contact the administrator',
            }

            Guilds.updateOne({ guild_id: guildID }, { $pull: { aliases: { _id: { $in: deleteIDs } } } })
                .then((response: updateOneResponse) => {
                    updateOneResponseHandler(response, updateStrings, textChannel)
                        .then((_) => {
                            resolve(response)
                        })
                        .catch((error) => {
                            reject(error)
                        })
                })
                .catch((error: any) => {
                    reject(error)
                })
        })
    }

    export async function editAliasByName(
        guildID: string,
        aliasName: string,
        newAliasID: string,
        newAliasType: Alias.Types,
        textChannel?: MessageChannel
    ) {
        const updateStrings: updateOneStrings = {
            success: 'Movie channel updated successfully',
            failure: 'Failed to update movie channel',
        }

        const response = await Guilds.updateOne(
            { guild_id: guildID, 'aliases.name': aliasName },
            { $set: { 'aliases.$.id': newAliasID, 'alias.$.type': newAliasType } }
        )

        return await updateOneResponseHandler(response, updateStrings, textChannel)
    }
}

export namespace Link {
    export enum LinkTypes {
        clip = 'clip',
        link = 'link',
    }

    export interface createLinkResponse {
        response: updateOneResponse
        goodNames: string[]
        rejectedNames: string[]
    }
    export function createLink(guildID: string, linkObj: ILink, textChannel?: MessageChannel) {
        const strings: updateOneStrings = {
            success: 'Link created successfully',
            failure: 'Error creating link',
        }
        return new Promise((resolve, reject) => {
            Guild.getGuild(guildID)
                .then((guildDoc) => {
                    const links = guildDoc.links
                    // checking if that link already exists
                    const existingLink = links.find((x) => x.link == linkObj.link)
                    if (existingLink) {
                        // this is now an edit link instead of a createLink
                    }

                    // need to validate that the names are going to be ok
                    const names = linkObj.names

                    // all names for links in this guild
                    const allUsedNames: string[] = _.flatten(links.map((link) => link.names))

                    const { approved, rejected } = uniqueArrayObject(allUsedNames, names)

                    if (textChannel) {
                        const msg = new MessageEmbed()

                        if (approved.length > 0) msg.addField('Approved Names', approved.join('\n'), false)
                        if (rejected.length > 0) msg.addField('Rejected Names', rejected.join('\n'), false)

                        sendToChannel(textChannel, msg, true)
                    }
                    if (approved.length == 0) {
                        if (textChannel) sendToChannel(textChannel, 'No approved aliases. Nothing will be added.', true)

                        const z: createLinkResponse = {
                            response: { n: 1, nModified: 0, ok: 1 },
                            goodNames: [],
                            rejectedNames: names,
                        }
                        resolve(z)
                        return
                    }

                    if (linkObj.type == LinkTypes.clip && !linkObj.volume) {
                        linkObj.volume = 0.5
                    }

                    Guilds.updateOne(
                        { guild_id: guildID },
                        {
                            $push:
                                //@ts-ignore
                                { links: linkObj },
                        }
                    ).then((response: updateOneResponse) => {
                        updateOneResponseHandler(response, strings, textChannel)
                            .then((x) => resolve(x))
                            .catch((error) => {
                                reject(error)
                            })
                    })
                })
                .catch((error) => reject(error))
        })
    }

    export interface viewLinksResponse {
        links: ILinkDoc[]
        message: MessageEmbed | string
        offset: number
    }
    export async function viewLinks(guildID: string, textChannel?: MessageChannel): Promise<viewLinksResponse> {
        try {
            const guildDoc = await Guild.getGuild(guildID)
            let embed: MessageEmbed | string
            const allLinks = guildDoc.links
            const offset = 1
            let linksFound: boolean = true

            const [clips, links] = _.partition(allLinks, (link: ILinkDoc) => link.type == Link.LinkTypes.clip)
            const linksSorted = clips.concat(links)

            if (linksSorted.length > 0) {
                const types = [
                    { array: clips, header: 'Clips' },
                    { array: links, header: 'Links' },
                ]

                const fields: any = []
                let overallCount = 0
                types.forEach((type) => {
                    const arr = type.array
                    let i: number,
                        j: number,
                        chunk = 5
                    for (i = 0, j = arr.length; i < j; i += chunk) {
                        let startCount = overallCount
                        const linkChunk = arr.slice(i, i + chunk)
                        const linkMessage = linkChunk.map((x, k) => {
                            return `${'**' + (i + k + offset) + '**. '}[${x.names.join(', ')}](${x.link} 'Link')`
                        })
                        overallCount += linkChunk.length
                        fields.push({
                            name: `${type.header} ${startCount + offset} - ${overallCount}`,
                            value: linkMessage,
                            inline: true,
                        })
                    }
                })

                embed = new MessageEmbed().setTitle('Link Catalog').addFields(fields)
            } else {
                embed = 'No links found'
                linksFound = false
            }

            if (textChannel)
                sendToChannel(
                    textChannel,
                    embed,
                    true,
                    linksFound ? 1 * NumberConstants.mins : 15 * NumberConstants.secs
                )

            return { links: linksSorted, message: embed, offset: offset }
        } catch (error) {
            throw error
        }
    }

    export async function selectLink(
        guildID: string,
        userID: string,
        textChannel: MessageChannel,
        multiple: boolean
    ): Promise<ILinkDoc | ILinkDoc[] | undefined> {
        //TODO: fill this out
        try {
            const { links, message, offset } = await viewLinks(guildID)

            if (typeof message !== 'string') {
                message.title = 'Select a link:'
            }

            if (links.length < 1) {
                sendToChannel(textChannel, message + '. Quitting...', true, 15 * NumberConstants.secs)
                return undefined
            }

            const link = await Prompt.arraySelect(userID, textChannel, links, message, {
                multiple: multiple,
                customOffset: offset,
            })

            let res: ILinkDoc | ILinkDoc[] | undefined
            if (link.arrayElement) res = link.arrayElement
            if (link.arrayElements) res = link.arrayElements
            if (res == undefined) return undefined
            return res
        } catch (error) {
            throw error
        }
    }

    export async function updateLinkUrl(
        guildID: string,
        link: ILinkDoc,
        newLink: string,
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: 'Link has been updated to ' + newLink,
                failure: 'There was an issue, link has not been updated',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID, 'links._id': link._id },
                { $set: { 'links.$.link': newLink } }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function addNames(
        guildID: string,
        link: ILinkDoc,
        names: string[],
        textChannel?: MessageChannel
    ): Promise<undefined | updateOneResponseHandlerResponse> {
        try {
            const guildDoc = await Guild.getGuild(guildID)

            const allUsedNames: string[] = _.flatten(guildDoc.links.map((link) => link.names))
            const { approved, rejected } = uniqueArrayObject(allUsedNames, names)

            if (approved.length < 1) {
                if (textChannel) sendToChannel(textChannel, 'All input names are not available.', true)
                return undefined
            }
            const multiple = approved.length > 1
            const updateStrings: updateOneStrings = {
                success: `Name${multiple ? 's' : ''} ${approved.join(', ')} ${multiple ? 'have' : 'has'} been added. ${
                    rejected.length > 0
                        ? `Name${multiple ? 's' : ''} ${rejected.join(', ')} ${multiple ? 'are' : 'is'} already in use.`
                        : ''
                }`,
                failure: 'There was an issue, no names have been added',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID, 'links._id': link._id },
                { $push: { 'links.$.names': approved } }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function removeNames(
        guildID: string,
        link: ILinkDoc,
        names: string[],
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            if (names.length == link.names.length) {
                // just delete the link
                return await deleteLink(guildID, link, textChannel)
            }
            const updateStrings: updateOneStrings = {
                success: `Names ${names.join(', ')} have been removed.`,
                failure: 'There was an issue, no names have been deleted',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID, 'links._id': link._id },
                //@ts-ignore
                { $pull: { 'links.$.names': { $in: names } } }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function editVolume(
        guildID: string,
        link: ILinkDoc,
        volume: number,
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            const updateStrings: updateOneStrings = {
                success: `Volume has been updated to ${volume}.`,
                failure: 'There was an issue, no names have been deleted',
            }
            const response = await Guilds.updateOne(
                { guild_id: guildID, 'links._id': link._id },
                { $set: { 'links.$.volume': volume } }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function deleteLink(
        guildID: string,
        link: ILinkDoc | ILinkDoc[],
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            let allIDs: any
            let successStr: string

            if (Array.isArray(link)) {
                allIDs = link.map((x) => x._id)
                successStr = `Links known as "${link.map((x) => x.names[0]).join(', ')}" has been deleted.`
            } else {
                allIDs = link._id
                successStr = `The link known as "${link.names.join(', ')}" has been deleted.`
            }

            const updateStrings: updateOneStrings = {
                success: successStr,
                failure: 'There was an error deleting the link. Please try again or contact the administrator',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $pull: { links: { _id: { $in: allIDs } } } }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function lookupLink(guildID: string, name: string): Promise<ILinkDoc | undefined> {
        const customQuery = {
            guild_id: guildID,
            links: { $elemMatch: { names: name } },
        }
        try {
            const guildDoc = await Guild.getGuild(guildID, customQuery)

            if (!guildDoc) return undefined

            const links = guildDoc.links

            return links.find((x) => x.names.includes(name))
        } catch (error) {
            if (error != undefined) throw error
        }
    }
}

export namespace Movie {
    export async function getMovie(guildID: string): Promise<IMovieContainerDoc | undefined> {
        try {
            const guildDoc = await Guild.getGuild(guildID)
            return guildDoc.movie
        } catch (error) {
            throw error
        }
    }

    export interface viewMovieParamsResponse {
        matcher: any
        regex: RegExp
    }
    export function viewMovieParams(guildID: string, movieNameSearch: string, loose = true): viewMovieParamsResponse {
        const regex = stringMatch(movieNameSearch, {
            loose: loose,
            trimInput: true,
        })
        const matcher = {
            $and: [
                { guild_id: guildID },
                {
                    'movie.movies': {
                        $elemMatch: { name: regex },
                    },
                },
            ],
        }
        return { matcher: matcher, regex: regex }
    }

    export interface getMoviesResponse {
        movies: IMovieDoc[]
        message: MessageEmbed | string
    }
    export async function getMovies(guildID: string, args: string[], number = false): Promise<getMoviesResponse> {
        try {
            const offset = 1
            const movieName = args.join(' ')

            let message: string | MessageEmbed
            let movies: IMovieDoc[]

            let movieRegex: RegExp
            let regexDefined = false
            let searchParams
            if (args.length == 0) {
                searchParams = { guild_id: guildID }
            } else {
                const paramsResponse = viewMovieParams(guildID, movieName, true)
                movieRegex = paramsResponse.regex
                regexDefined = true
                searchParams = paramsResponse.matcher
            }
            // prints all the movies from the database

            const movieDoc = await getMovie(guildID)

            if (!movieDoc || movieDoc.movies.length < 1) {
                message = `Couldn't find any movies. Add some with the addmovie command.`
                if (movieName != '') message += ` with search parameters "${movieName}"`
                movies = []
            } else {
                const defaultPassword = movieDoc.default_password
                movies = movieDoc.movies

                if (regexDefined) {
                    movies = movies.filter((x) => movieRegex.test(x.name))
                }

                // need to chunk the fields so discord doesnt error us out
                const fields = []
                let i: number,
                    j: number,
                    chunk = 5
                for (i = 0, j = movies.length; i < j; i += chunk) {
                    const movie_chunk = movies.slice(i, i + chunk)
                    let movies_message = movie_chunk
                        .map((x, k) => {
                            let movie_str = `${number ? '**' + (i + k + offset) + '**. ' : ''}[${x.name}](${
                                x.link
                            } 'Download Link')`
                            if (x.password != 'none' && x.password != defaultPassword)
                                movie_str += `, ||${x.password}||`
                            return movie_str
                        })
                        .join('\n')
                    fields.push({
                        name: `${i + 1} to ${i + chunk}`,
                        value: movies_message,
                        inline: true,
                    })
                }

                message = new MessageEmbed()
                    .setTitle(
                        `Movie Catalog ${
                            movieDoc.default_password != '' ? `\nDefault Password: ${defaultPassword}` : ''
                        }`
                    )
                    .addFields(fields)
            }

            return { movies: movies, message: message }
        } catch (error) {
            throw error
        }
    }

    export async function lookupMovieByID(guildID: string, lookupID: Schema.Types.ObjectId) {
        return (await getMovies(guildID, [])).movies.find((x) => x._id == lookupID)
    }

    export async function getMovieDefaultPassword(guildID: string): Promise<string> {
        try {
            const movieDoc = await getMovie(guildID)
            if (movieDoc) {
                return movieDoc.default_password
            }
            throw new Error('Movie default password not found')
        } catch (error) {
            throw error
        }
    }

    export async function addMovie(
        guildID: string,
        userID: string,
        movieLink: string,
        movieName: string,
        moviePassword: string,
        zipName?: string,
        mega = false,
        megaID?: Schema.Types.ObjectId,
        guild?: GuildD,
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            const nameMatch = stringMatch(movieName, {
                loose: false,
                trimInput: true,
            })

            const movieObj: IMovie = {
                link: movieLink,
                name: movieName,
                password: moviePassword,
                user: userID,
                want_to_watch: [],
                mega: mega,
                megaID: megaID,
                zipName: zipName,
            }

            let update: boolean = false

            const movieDoc = await getMovie(guildID)
            if (!movieDoc) {
                throw new Error('Could not find the movie subdoc')
            }

            const movieExists = movieDoc.movies.find((x) => nameMatch.test(x.name))

            let movieUpdateResponse
            let successString: string

            if (movieExists) {
                update = true
                movieUpdateResponse = await Guilds.updateOne(
                    { guild_id: guildID, 'movie.movies.name': nameMatch },
                    {
                        $set: {
                            'movie.movies.$.link': movieLink,
                            'movie.movies.$.password': moviePassword,
                        },
                    }
                )
                successString = `${movieName} existed in the database before. The link and password has been updated`
            } else {
                movieUpdateResponse = await Guilds.updateOne(
                    { guild_id: guildID },
                    {
                        $push: {
                            'movie.movies': {
                                $each: [movieObj],
                                $sort: { name: 1 },
                            },
                        },
                    }
                )

                successString = `${movieName} has been added to the catalog successfully`

                const requested = movieDoc.requests.find((x) => nameMatch.test(x.name))

                if (requested) {
                    requested
                    const response2 = await Guilds.updateOne(
                        { guild_id: guildID },
                        //@ts-ignore
                        { $pull: { 'movie.requests': { name: nameMatch } } },
                        { multi: true }
                    )

                    const requestResponse = await updateOneResponseHandler(response2, { success: '', failure: '' })
                    if (requestResponse.updated) {
                        if (textChannel && guild)
                            MovieUtil.notifyUsersRequestFulfilled(requested, textChannel.client, guild)
                        successString += '\nIt has also been removed from requests.'
                    }
                }
            }

            const updateStrings: updateOneStrings = {
                success: successString,
                failure: 'There was an issue adding the movie to the catalog',
            }

            const res = updateOneResponseHandler(movieUpdateResponse, updateStrings, textChannel)
            return res
        } catch (error) {
            throw error
        }
    }

    export async function deleteMovie(
        guildID: string,
        movie: IMovieDoc | IMovieDoc[],
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            let deleteIDs: any[] = []
            let deleteNames: string[] = []
            let deleteMegaIDs: any[] = []
            let deleteZipNames: string[] = []
            if (Array.isArray(movie)) {
                movie.forEach((x) => {
                    deleteIDs.push(x._id)
                    deleteNames.push(x.name)
                    if (x.mega) {
                        deleteMegaIDs.push(x.megaID)
                        if (x.zipName) deleteZipNames.push(x.zipName)
                    }
                })
            } else {
                deleteIDs.push(movie._id)
                deleteNames.push(movie.name)
            }

            const updateStrings: updateOneStrings = {
                success: `${deleteNames.join(', ')} has been deleted from the catalog`,
                failure: `There was an error deleting ${deleteNames.join(', ')} from the catalog `,
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                {
                    $pull: {
                        //@ts-ignore
                        'movie.movies': { _id: { $in: deleteIDs } },
                        'movie.downloads.uploadedQueue': { _id: { $in: deleteMegaIDs } },
                    },
                    $addToSet: { 'movie.downloads.deleteQueue': deleteZipNames },
                },
                { multi: true }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            if (textChannel) sendToChannel(textChannel, 'Error deleting movies', true)
            throw error
        }
    }

    export async function getSoundDoc(guildID: string, soundName: string): Promise<ISoundDoc | undefined> {
        try {
            const movieDoc = await getMovie(guildID)

            if (!movieDoc) return undefined

            return movieDoc.sounds.find((x) => x.name == soundName)
        } catch (error) {
            throw error
        }
    }

    export async function toggleSoundDoc(guildID: string, soundName: string, textChannel?: MessageChannel) {
        try {
            const soundDoc = await getSoundDoc(guildID, soundName)

            if (soundDoc) {
                const updateStrings: updateOneStrings = {
                    success: `${soundName} is now ${soundDoc.enabled ? 'disabled' : 'enabled'}`,
                    failure: 'Error. No change has been made.',
                }
                const response = await Guilds.updateOne(
                    { guild_id: guildID, 'movie.sounds._id': soundDoc._id },
                    { $set: { 'movie.sounds.$.enabled': !soundDoc.enabled } }
                )
                return updateOneResponseHandler(response, updateStrings, textChannel)
            } else {
                if (textChannel) sendToChannel(textChannel, 'Error on my end.')
            }
        } catch (error) {
            throw error
        }
    }

    export async function editReactionEmoji(
        guildID: string,
        guild: GuildD,
        emojiName: string,
        newEmoji: string,
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: `${emojiName} emoji has been updated`,
                failure: 'Failed to update emoji',
            }
            const emojiString = EmojiUtil.emojiIDToString(newEmoji, guild)

            const response = await Guilds.updateOne(
                { guild_id: guildID, 'movie.emojis.name': emojiName },
                { $set: { 'movie.emojis.$.emoji': emojiString } }
            )

            updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function editDefaultPassword(guildID: string, newPassword: string, textChannel?: MessageChannel) {
        try {
            const updateStrings: updateOneStrings = {
                success: `Default movie password is now ${newPassword}`,
                failure: 'Error. Default movie password has not been updated',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                {
                    $set: { 'movie.default_password': newPassword },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function addRequest(guildID: string, userID: string, movieName: string, textChannel?: MessageChannel) {
        try {
            const updateStrings: updateOneStrings = {
                success: `${movieName} has been requested.`,
                failure: 'Either movie was not requested or you have requested already',
            }
            let response: updateOneResponse

            const movieObj: IMovieRequest = {
                name: movieName,
                users: [userID],
            }
            const alreadyRequested = await movieAlreadyRequested(guildID, movieName)
            if (alreadyRequested) {
                if (textChannel) sendToChannel(textChannel, 'Movie is already requested')
                response = await Guilds.updateOne(
                    {
                        guild_id: guildID,
                        'movie.requests.name': movieName,
                    },
                    {
                        $addToSet: {
                            'movie.requests.$.users': userID,
                        },
                    }
                )
            } else {
                response = await Guilds.updateOne(
                    {
                        guild_id: guildID,
                        'movie.requests.name': { $ne: movieName },
                    },
                    {
                        $push: {
                            'movie.requests': {
                                $each: [movieObj],
                                $sort: { name: 1 },
                            },
                        },
                    }
                )
            }
            updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function movieAlreadyRequested(guildID: string, movieName: string) {
        try {
            const guildDoc = await Guild.getGuild(guildID)
            const regex = stringMatch(movieName, { loose: false })
            const foundRequest = guildDoc.movie.requests.find((x) => regex.test(x.name))
            return foundRequest != undefined
        } catch (error) {
            throw error
        }
    }

    export interface GetRequestedMoviesResponse {
        requestedMovies: IMovieRequestDoc[]
        message: MessageEmbed | string
    }
    export async function getRequestedMovies(guildID: string, number = true) {
        try {
            const offset = 1
            const guildDoc = await Guild.getGuild(guildID)
            const requestedMovieArr = guildDoc.movie.requests

            let message: MessageEmbed | string

            if (requestedMovieArr.length > 0) {
                const fields = []
                let i: number,
                    j: number,
                    chunk = 5
                for (i = 0, j = requestedMovieArr.length; i < j; i += chunk) {
                    const movie_chunk = requestedMovieArr.slice(i, i + chunk)
                    let requestedMessage = movie_chunk
                        .map((x, k) => {
                            return `${number ? '**' + (i + k + offset) + '**. ' : ''}${x.name}`
                        })
                        .join('\n')
                    fields.push({
                        name: `${i + 1} to ${i + chunk}`,
                        value: requestedMessage,
                        inline: true,
                    })
                }

                message = new MessageEmbed().setTitle(`Requested Movies`).addFields(fields)
            } else {
                message = 'No movies requested currently. Use command requestmovie to add some'
            }

            return { requestedMovies: requestedMovieArr, message: message }
        } catch (error) {
            throw error
        }
    }

    export interface GetUserReqestedMoviesResponse {
        requestedMovies: IMovieRequestDoc[]
        message: MessageEmbed | string
    }
    export async function getUserRequestedMovies(guildID: string, userID: string, number = true) {
        try {
            const offset = 1

            let message: MessageEmbed | string
            const { requestedMovies } = await getRequestedMovies(guildID, false)

            const requestedMovieArr = requestedMovies.filter((x) => x.users.includes(userID))

            if (requestedMovieArr.length > 0) {
                const fields = []
                let i: number,
                    j: number,
                    chunk = 5
                for (i = 0, j = requestedMovieArr.length; i < j; i += chunk) {
                    const movie_chunk = requestedMovieArr.slice(i, i + chunk)
                    let requestedMessage = movie_chunk
                        .map((x, k) => {
                            return `${number ? '**' + (i + k + offset) + '**. ' : ''}${x.name}`
                        })
                        .join('\n')
                    fields.push({
                        name: `${i + 1} to ${i + chunk}`,
                        value: requestedMessage,
                        inline: true,
                    })
                }

                message = new MessageEmbed().setTitle(`Requested Movies`).addFields(fields)
            } else {
                message = 'No movies requested currently. Use command requestmovie to add some'
            }

            return { requestedMovies: requestedMovieArr, message: message }
        } catch (error) {
            throw error
        }
    }

    export async function deleteRequestedMovie(
        guildID: string,
        userID: string,
        requestDoc: IMovieRequestDoc,
        textChannel?: MessageChannel
    ) {
        try {
            let response: updateOneResponse
            let updateStrings: updateOneStrings
            if (requestDoc.users.length == 1) {
                updateStrings = {
                    success: 'Movie request has been fully deleted',
                    failure: 'Failed to delete movie request',
                }
                response = await Guilds.updateOne(
                    { guild_id: guildID },
                    //@ts-ignore
                    { $pull: { 'movie.requests': { _id: requestDoc._id } } }
                )
            } else {
                updateStrings = {
                    success: 'You have been removed from requesting the movie',
                    failure: 'Failed to delete movie request',
                }
                response = await Guilds.updateOne(
                    { guild_id: guildID, 'movie.requests._id': requestDoc._id },
                    {
                        $pull: {
                            //@ts-ignore
                            'movie.requests.$.users': userID,
                        },
                    }
                )
            }

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function addToWatchList(
        guildID: string,
        userID: string,
        movies: IMovieDoc[],
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings = {
                success: `Added ${movies.map((x) => x.name).join(', ')} to your watch list`,
                failure: 'Already in your watch list',
            }
            const movieIDs = movies.map((x) => x._id)
            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'movie.movies._id': { $in: movieIDs },
                },
                { $addToSet: { 'movie.movies.$.want_to_watch': userID } }
            )

            updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export interface GetWatchListForMemberResponse {
        watchListArray: IMovieDoc[]
        message?: MessageEmbed
        stringMessage?: string
    }
    export async function getWatchListForMember(
        guildID: string,
        userID: string,
        guild: GuildD,
        number = true
    ): Promise<GetWatchListForMemberResponse> {
        try {
            let message: MessageEmbed | undefined
            let stringMessage: string | undefined
            const movieContainerDoc = await getMovie(guildID)

            if (!movieContainerDoc) throw new Error('No moviecontainer found')
            const watchList = movieContainerDoc.movies.filter((x: IMovieDoc) =>
                x.want_to_watch.find((user) => user == userID)
            )

            const offset = 1
            if (watchList.length > 0) {
                const fields = []
                let i: number,
                    j: number,
                    chunk = 5
                for (i = 0, j = watchList.length; i < j; i += chunk) {
                    const movie_chunk = watchList.slice(i, i + chunk)
                    let requestedMessage = movie_chunk
                        .map((x, k) => {
                            return `${number ? '**' + (i + k + offset) + '**. ' : ''}${x.name}`
                        })
                        .join('\n')
                    fields.push({
                        name: `${i + 1} to ${i + chunk}`,
                        value: requestedMessage,
                        inline: true,
                    })
                }

                message = new MessageEmbed()
                    .setTitle(`Watchlist for ${guild.members.resolve(userID)?.displayName}`)
                    .addFields(fields)
            } else {
                stringMessage = 'No movies on this users watch list'
            }
            return { watchListArray: watchList, message: message, stringMessage: stringMessage }
        } catch (error) {
            throw error
        }
    }

    export async function deleteFromWatchList(
        guildID: string,
        userID: string,
        deleteElements: IMovieDoc[],
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: `${deleteElements.map((x) => x.name).join(', ')} have been removed form your watch list`,
                failure: 'Failed to delete movies from your watchlist',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID, 'movie.movies._id': deleteElements.map((x) => x._id) },
                {
                    $pull: {
                        //@ts-ignore
                        'movie.movies.$.want_to_watch': userID,
                    },
                }
            )

            updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function createMovieDownloadRequest(
        guildID: string,
        userID: string,
        movieName: string,
        torrentLink: string,
        zipName: string,
        zipPassword: string,
        textChannel?: MessageChannel
    ) {
        const updateStrings: updateOneStrings = {
            success: 'Download request has been created. ',
            failure: 'Failed to start downloading this movie.',
        }

        let validZipName = zipName
        if (!zipName.endsWith('.zip')) validZipName += '.zip'

        const downloadObj: IMovieDownloadElement = {
            userID: userID,
            movieName: movieName,
            torrentLink: torrentLink,
            zipName: validZipName,
            zipPassword: zipPassword,
            downloaded: false,
            downloading: false,
            secondsDownloading: 0,
            downloadPercent: 0,
            uploaded: false,
            uploading: false,
            secondsUploading: 0,
            uploadPercent: 0,
            error: false,
        }

        const response = await Guilds.updateOne(
            { guild_id: guildID },
            {
                $push: {
                    'movie.downloads.downloadQueue': downloadObj,
                },
            }
        )

        return updateOneResponseHandler(response, updateStrings, textChannel)
    }

    export async function getDownloadMovieContainer(guildID: string) {
        const guildDoc = await Guild.getGuild(guildID)
        return guildDoc.movie.downloads
    }

    export async function lookupMovieDownloadByID(guildID: string, movieID: Schema.Types.ObjectId) {
        const movieContainer = await getDownloadMovieContainer(guildID)
        const movie = movieContainer.downloadQueue.find((x) => x._id.equals(movieID))
        return movie
    }

    export async function getFirstDownloadRequest(guildID: string) {
        const downloadsDoc = await getDownloadMovieContainer(guildID)
        if (downloadsDoc.downloadQueue.length > 0) return downloadsDoc.downloadQueue[0]
        return null
    }

    export async function getDownloadedMovies() {
        const guildDocs = await Guilds.find({
            $and: [{ premium: true }, { 'movie.downloads.downloadQueue': { $not: { $size: 0 } } }],
        })

        if (guildDocs.length > 0) {
            return guildDocs.map((guildDoc) => {
                const downloadQueue = guildDoc.movie.downloads.downloadQueue
                return {
                    guildID: guildDoc.guild_id,
                    downloads: downloadQueue.filter((x) => x.uploaded == true),
                }
            })
        } else {
            return []
        }
    }

    export async function moveToUploaded(guildID: string, movie: IMovieDownloadElementDoc, movieDoc: IMovieDoc) {
        // movie.movieID = movieDoc._id
        const response = await Guilds.updateOne(
            { guild_id: guildID },
            {
                $pull: {
                    //@ts-ignore
                    'movie.downloads.downloadQueue': { _id: movie._id },
                },
                $push: {
                    //@ts-ignore
                    'movie.downloads.uploadedQueue': movie,
                },
            }
        )

        updateOneResponseHandler(response, { success: 'Success', failure: 'Failure' })
    }

    export async function deleteMegaMovie(guildID: string, movie: IMovieDownloadElementDoc) {
        const response = await Guilds.updateOne(
            { guild_id: guildID },
            {
                $pull: {
                    //@ts-ignore
                    'movie.download.uploadedQueue': { _id: movie._id },
                    'movie.movies': { _id: movie.movieID },
                },

                $push: { 'movie.download.deleteQueue': movie.zipName },
            }
        )

        updateOneResponseHandler(response, { success: 'Success', failure: 'Failure' })
    }

    export async function getUploadedMovies(guildID: string) {
        const downloadDoc = await getDownloadMovieContainer(guildID)
        return downloadDoc.uploadedQueue
    }
}

export namespace Config {
    export enum AutoDeleteType {
        prefix = 'prefix',
        user = 'user',
    }

    export function getGuildConfig(guildID: string): Promise<IConfigDoc> {
        return new Promise(async (resolve, reject) => {
            Guild.getGuild(guildID)
                .then((guildDoc) => {
                    guildDoc && guildDoc.config ? resolve(guildDoc.config) : reject(null)
                })
                .catch((error) => {
                    reject(error)
                })
        })
    }

    export function getGuildPrefix(guildID: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            getGuildConfig(guildID)
                .then((config) => {
                    resolve(config.prefix)
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    export async function getTimeZoneName(guildID: string): Promise<string> {
        try {
            const configDoc = await getGuildConfig(guildID)
            return configDoc.tz.name
        } catch (error) {
            throw error
        }
    }
    export async function setPrefix(
        guildID: string,
        newPrefix: string,
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            const updateStrings: updateOneStrings = {
                success: `Prefix has been set to ${newPrefix}`,
                failure: 'Error updating prefix',
            }
            const response = await Guilds.updateOne({ guild_id: guildID }, { $set: { 'config.prefix': newPrefix } })

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function setTimeZone(
        guildID: string,
        timeZone: moment.MomentZoneOffset,
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            const updateStrings: updateOneStrings = {
                success: `Time zone has been set to ${timeZone.name}`,
                failure: 'Failed to update the time zone',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $set: { 'config.tz.name': timeZone.name } }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function addAutoDeleteElement(
        guildID: string,
        matchOn: string,
        type: Config.AutoDeleteType,
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            // already known that this is a new prefix, no need to check
            const elementObj: IAutoDeleteElement = {
                matchOn: matchOn,
                allowList: [],
                specified: [],
                allowMode: false,
                type: type,
                defaultDeleteTime: NumberConstants.mins,
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $push: { 'config.autodelete': elementObj } }
            )

            return await updateOneResponseHandler(
                response,
                {
                    success: `${
                        type == Config.AutoDeleteType.prefix ? `Prefix ${matchOn}` : `User id ${matchOn}`
                    } has been added`,
                    failure: 'Failed to add',
                },
                textChannel
            )
        } catch (error) {
            throw error
        }
    }

    export async function getAutoDeleteElement(
        guildID: string,
        matchOn: string,
        type: AutoDeleteType
    ): Promise<IAutoDeleteElementDoc | undefined> {
        try {
            const configDoc = await getGuildConfig(guildID)

            const foundPrefix = configDoc.autodelete.find((x) => x.matchOn === matchOn && x.type == type)

            return foundPrefix
        } catch (error) {
            throw error
        }
    }

    export async function changeAutoDeleteElementDefaultTime(
        guildID: string,
        elementDoc: IAutoDeleteElementDoc,
        time: number,
        textChannel?: MessageChannel
    ) {
        // getting the latest

        try {
            if (!elementDoc) {
                return undefined
            }

            const updateStrings: updateOneStrings = {
                success: `Default delete time is now ${time / NumberConstants.secs}`,
                failure: 'Failed to update time.',
            }

            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'config.autodelete._id': elementDoc._id,
                },
                {
                    $set: {
                        'config.autodelete.$.defaultDeleteTime': time,
                    },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function changeAutoDeleteElementMode(
        guildID: string,
        elementDoc: IAutoDeleteElementDoc,
        textChannel?: MessageChannel
    ) {
        // getting the latest

        try {
            if (!elementDoc) {
                return undefined
            }

            const updateStrings: updateOneStrings = {
                success: 'Updated the auto delete mode',
                failure: 'Failed to update the mode.',
            }

            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'config.autodelete._id': elementDoc._id,
                },
                {
                    $set: {
                        'config.autodelete.$.allowMode': !elementDoc.allowMode,
                    },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function deleteAutoDeleteElement(
        guildID: string,
        matchOn: string,
        type: AutoDeleteType,
        textChannel?: MessageChannel
    ) {
        try {
            const elementDoc = await Config.getAutoDeleteElement(guildID, matchOn, type)

            if (!elementDoc) {
                return undefined
            }

            const updateStrings: updateOneStrings = {
                success: `${matchOn} has been removed from autodeleting`,
                failure: `There was an error. ${matchOn} was not removed`,
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                {
                    $pull: {
                        //@ts-ignore
                        'config.autodelete': { _id: { $in: [elementDoc._id] } },
                    },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function addAutoDeleteElementAllowed(
        guildID: string,
        elementDoc: IAutoDeleteElementDoc,
        whitelist: string[],
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: `${whitelist.join(', ')} have been added to the whitelist`,
                failure: `Failed to add to the whitelist.`,
            }

            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'config.autodelete._id': elementDoc._id,
                },
                {
                    $addToSet: {
                        'config.autodelete.$.allowList': { $each: whitelist },
                    },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function removeAutoDeleteElementAllowed(
        guildID: string,
        elementDoc: IAutoDeleteElementDoc,
        deleteNames: string[],
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: `${deleteNames.join(', ')} have been removed from the whitelist`,
                failure: `Failed to add to the whitelist.`,
            }

            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'config.autodelete._id': elementDoc._id,
                },
                {
                    $pull: {
                        //@ts-ignore
                        'config.autodelete.$.allowList': { $in: deleteNames },
                    },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function addAutoDeleteElementSpecified(
        guildID: string,
        matchOn: string,
        type: AutoDeleteType,
        specifiedObj: IAutoDeleteSpecified,
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: `${matchOn + specifiedObj.startsWith} will now delete after ${
                    specifiedObj.timeToDelete
                } seconds`,
                failure: 'Error creating this delete rule.',
            }

            const elementDoc = await getAutoDeleteElement(guildID, matchOn, type)
            if (!elementDoc) throw new Error('Not found')
            const commandsSpecified = elementDoc.specified.map((x) => x.startsWith)

            if (commandsSpecified.find((x) => x == specifiedObj.startsWith)) {
                // updating instead of  creating
                return Config.changeAutoDeleteElementSpecified(guildID, elementDoc, specifiedObj, textChannel)
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID, 'config.autodelete._id': elementDoc._id },
                {
                    $push: { 'config.autodelete.$.specified': specifiedObj },
                }
            )

            updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function changeAutoDeleteElementSpecified(
        guildID: string,
        elementDoc: IAutoDeleteElementDoc,
        specifiedObj: IAutoDeleteSpecified,
        textChannel?: MessageChannel
    ) {
        try {
            if (!elementDoc) return undefined
            const updateStrings: updateOneStrings = {
                success: `${elementDoc.matchOn + specifiedObj.startsWith} now deletes after ${
                    specifiedObj.timeToDelete
                } seconds `,
                failure: 'Error editing the delete time',
            }

            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'config.autodelete._id': elementDoc._id,
                },
                {
                    $set: { 'config.autodelete.$.specified.$[e1]': specifiedObj.timeToDelete },
                },
                { arrayFilters: [{ 'e1.startsWith': specifiedObj.startsWith }] }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }
    export async function removeAutoDeleteElementSpecified(
        guildID: string,
        elementDoc: IAutoDeleteElementDoc,
        specifiedObj: IAutoDeleteSpecified,
        textChannel?: MessageChannel
    ) {
        try {
            if (!elementDoc) return undefined
            const updateStrings: updateOneStrings = {
                success: `${elementDoc.matchOn + specifiedObj.startsWith} specific delete time rule has been deleted`,
                failure: 'Error editing the delete time',
            }

            const response = await Guilds.updateOne(
                {
                    guild_id: guildID,
                    'config.autodelete._id': elementDoc._id,
                },
                {
                    //@ts-ignore
                    $pull: { 'config.autodelete.$.specified': specifiedObj },
                }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function getArchiveConfig(guildID: string) {
        try {
            const configDoc = await getGuildConfig(guildID)
            return configDoc.archive
        } catch (error) {
            throw error
        }
    }

    export async function setMessageArchiveChannel(
        guildID: string,
        newChannelID: string,
        textChannel?: MessageChannel
    ) {
        try {
            const updateStrings: updateOneStrings = {
                success: 'Archive channel has been set',
                failure: 'Failed to update archive channel settings',
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $set: { 'config.archive.channel': newChannelID, 'config.archive.enabled': true } }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function toggleMessageArchiveMode(guildID: string, textChannel?: MessageChannel) {
        try {
            const config = await getGuildConfig(guildID)
            const enabled = config.archive.enabled
            const status = !enabled ? 'enabled' : 'disabled'
            const updateStrings: updateOneStrings = {
                success: `Archive channel is now ${status}.`,
                failure: 'Error toggling archive channel mode. It will stay as ' + status,
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $set: { 'config.archive.enabled': !enabled } }
            )

            updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function toggleArchiveSaveBotMessages(guildID: string, textChannel?: MessageChannel) {
        const config = await getGuildConfig(guildID)
        const enabled = config.archive.save_bot_commands
        const status = !enabled ? 'enabled' : 'disabled'
        const updateStrings: updateOneStrings = {
            success: `Saving bot commands is now ${status}.`,
            failure: 'Error toggling save bot commands mode. It will stay as ' + status,
        }

        const response = await Guilds.updateOne(
            { guild_id: guildID },
            { $set: { 'config.archive.save_bot_commands': !enabled } }
        )

        updateOneResponseHandler(response, updateStrings, textChannel)
    }
}

export namespace Player {
    export async function updateLastVoiceActivity(guildID: string, channelID: string, timestamp: Date) {
        const updateStrings: updateOneStrings = {
            success: 'Updated the last voice activity',
            failure: `Failure updating the last voice activity for guild id = ${guildID}`,
        }

        const response = await Guilds.updateOne(
            {
                guild_id: guildID,
            },
            {
                $set: {
                    'player.lastStreamingTime': timestamp,
                    'player.lastChannelID': channelID,
                },
            }
        )

        updateOneResponseHandler(response, updateStrings)
    }

    export async function getPlayer(guildID: string) {
        const guild = await Guild.getGuild(guildID)

        return guild.player
    }
}
