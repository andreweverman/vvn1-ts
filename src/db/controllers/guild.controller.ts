import Guilds, {
    IGuild,
    IAlias,
    IGuildDoc,
    IConfigDoc,
    IAliasDoc,
    ILink,
    ILinkDoc,
    IMovie,
    IMovieDoc,
    IMovieContainer,
    IMovieContainerDoc,
    IAutoDeletePrefix,
    IAutoDeletePrefixDoc,
} from '../models/guild.model'
import { CreateQuery, MongooseDocument, MongooseUpdateQuery, QueryUpdateOptions, UpdateQuery } from 'mongoose'
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
import { MessageEmbed } from 'discord.js'
import { sendToChannel, MessageChannel, Prompt } from '../../util/message.util'
import { stringMatch } from '../../util/string.util'
import moment from 'moment-timezone'

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

            return link
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
            const guildDoc = Guild.getGuild(guildID, customQuery)

            if (!guildDoc) return undefined

            const links = (await guildDoc).links

            return links.find((x) => x.names.includes(name))
        } catch (error) {
            throw error
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
        const regex = stringMatch(movieNameSearch, { loose: loose, trimInput: true })
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

                // movies.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

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
                    { $set: { 'movie.movies.$.link': movieLink, 'movie.movies.$.password': moviePassword } }
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
                    const response2 = await Guilds.updateOne(
                        { guild_id: guildID },
                        { $pull: { 'movie.requests': { name: nameMatch } } },
                        { multi: true }
                    )

                    successString += '\nIt has also been removed from requests.'
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
            if (Array.isArray(movie)) {
                movie.forEach((x) => {
                    deleteIDs.push(x._id)
                    deleteNames.push(x.name)
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
                { $pull: { 'movie.movies': { _id: { $in: deleteIDs } } } },
                { multi: true }
            )

            return await updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            if (textChannel) sendToChannel(textChannel, 'Error deleting movies', true)
            throw error
        }
    }
}

export namespace Config {
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

    export async function addPrefixAutoDelete(
        guildID: string,
        prefix: string,
        textChannel?: MessageChannel
    ): Promise<updateOneResponseHandlerResponse> {
        try {
            // already known that this is a new prefix, no need to check
            const prefixObj: IAutoDeletePrefix = {
                prefix: prefix,
                allowList: [],
                specified: [],
                allowMode: false,
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $push: { 'config.autodelete_prefixes': prefixObj } }
            )

            return await updateOneResponseHandler(
                response,
                { success: `${prefix} has been added`, failure: 'Prefix failed to add' },
                textChannel
            )
        } catch (error) {
            throw error
        }
    }

    export async function getAutoDeletePrefix(
        guildID: string,
        prefix: string
    ): Promise<IAutoDeletePrefixDoc | undefined> {
        try {
            const configDoc = await getGuildConfig(guildID)

            const foundPrefix = configDoc.autodelete_prefixes.find((x) => x.prefix === prefix)

            return foundPrefix
        } catch (error) {
            throw error
        }
    }

    export async function addPrefixSpecificDelete(guildID: string) {}

    export async function changePrefixAutoDeleteMode(guildID: string, prefix: string, textChannel?: MessageChannel) {
        // getting the latest
        const prefixDoc = await Config.getAutoDeletePrefix(guildID, prefix)

        if (!prefixDoc) {
            return undefined
        }

        const updateStrings: updateOneStrings = {
            success: 'Updated the auto delete mode',
            failure: 'Failed to update the mode.',
        }

        const response = await Guilds.updateOne(
            { guild_id: guildID, 'config.autodelete_prefixes.prefix': prefix },
            { $set: { 'config.autodelete_prefixes.$.allowMode': !prefixDoc.allowMode } }
        )

        return updateOneResponseHandler(response, updateStrings, textChannel)
    }

    export async function deletePrefixAutoDelete(guildID: string, prefix: string, textChannel?: MessageChannel) {
        try {
            const prefixDoc = await Config.getAutoDeletePrefix(guildID, prefix)

            if (!prefixDoc) {
                return undefined
            }

            const updateStrings: updateOneStrings = {
                success: `${prefix} has been removed from autodeleting`,
                failure: `There was an error. ${prefix} was not removed`,
            }

            const response = await Guilds.updateOne(
                { guild_id: guildID },
                { $pull: { 'config.autodelete_prefixes': { _id: { $in: [prefixDoc._id] } } } }
            )

            return updateOneResponseHandler(response, updateStrings, textChannel)
        } catch (error) {
            throw error
        }
    }
}
