/**
 *
 *  Utility for misc things
 *
 *  This is a place for any functionality form the commands that is useful to reuse can be put
 *  This is good for the prompting of things that can be used across multiple areas
 *
 * @file   Utility for misc things
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import {
    Client,
    GuildMember,
    VoiceChannel,
    Guild as GuildD,
    GuildChannel,
    Collection,
    GuildEmoji,
    Role,
} from 'discord.js'
import { selfPronouns, groupPronouns, NumberConstants, vote } from './constants'
import { Guild, Link, Movie, Config } from '../db/controllers/guildController'
import { IMovieContainerDoc, IMovieRequestDoc, IReactionEmojiDoc } from '../db/models/guildModel'
import { extractActiveUsers, extractVCMembers } from './discordUtil'
import { linkRegex, spaceCommaRegex, youtubeRegex, guildEmojiRegex } from './stringUtil'
import { Filter, Prompt as MPrompt, MessageChannel, Prompt, sendToChannel } from './messageUtil'
import { IConfigDoc, ILinkDoc, IAutoDeleteElement, IAutoDeleteSpecified, IMovieDoc } from '../db/models/guildModel'
import moment from 'moment-timezone'
import axios from 'axios'
import cheerio from 'cheerio'
import emoji from 'node-emoji'

export namespace AliasUtil {
    export interface parseChannelAndMembersResponse {
        members: GuildMember[]
        voiceChannels: VoiceChannel[]
        textChannels: GuildChannel[]
        moveChannel?: VoiceChannel
    }
    export interface parseChannelsAndMembersOptions {
        member?: GuildMember
        moveMode?: boolean
    }
    export async function parseChannelsAndMembers(
        guild: GuildD,
        args: string[],
        options: parseChannelsAndMembersOptions
    ): Promise<parseChannelAndMembersResponse> {
        const member = options.member

        let members: GuildMember[] = []
        const voiceChannels: VoiceChannel[] = []
        const textChannels: GuildChannel[] = []
        let moveChannel

        // first lets make everything either a string or the id
        let query: string[] = []
        args.forEach((x) => {
            // seeing if gave a resolvable for user
            const user = guild.member(x)
            if (user) {
                members.push(user)
                return
            }
            // seeing if gave a resolvable for channel
            const channel = guild.channels.resolve(x)
            if (channel) {
                channel.type == 'voice' ? voiceChannels.push(channel as VoiceChannel) : textChannels.push(channel)
                return
            }

            let found: boolean = true
            // either pronoun or need to lookup
            if (member && member.voice.channel) {
                if (groupPronouns.includes(x)) {
                    Array.from(member.voice.channel.members.entries())
                        .map((el) => el[1])
                        .forEach((y) => members.push(y))
                } else if (selfPronouns.includes(x)) {
                    members.push(member)
                } else if ('here'.includes(x)) {
                    if (member.voice.channel) voiceChannels.push(member.voice.channel)
                } else {
                    found = false
                }
            } else {
                found = false
            }
            if (!found) query.push(x)
        })

        // then we will look them up in the database
        if (query.length > 0) {
            const alias_doc = await Guild.getGuild(guild.id)
            // once we have the models down, we will separate the voice channels and users
            query.forEach(async (q) => {
                const name_regex = new RegExp(`^${q}$`, 'i')
                const alias = alias_doc.aliases.find((x) => name_regex.test(x.name))
                let bad_alias = false
                if (alias) {
                    if (alias.type == 'user') {
                        // const obj = guild.member(alias.id);
                        const obj = await guild.members.fetch(alias.id)
                        obj ? members.push(obj) : (bad_alias = true)
                    } else if (alias.type == 'voice') {
                        const obj = guild.channels.resolve(alias.id)
                        obj && obj.type == alias.type ? voiceChannels.push(obj as VoiceChannel) : (bad_alias = true)
                    } else if (alias.type == 'text') {
                        const obj = guild.channels.resolve(alias.id)
                        obj && obj.type == alias.type ? textChannels.push(obj) : (bad_alias = true)
                    } else {
                        bad_alias = true
                    }

                    if (bad_alias) {
                        // alias that is unresolvable gets BOOTED
                        // TODO: put the Alias.deleteAlias call here
                    }
                }
            })
        }

        if (options.moveMode) {
            if (voiceChannels.length > 0) moveChannel = voiceChannels[voiceChannels.length - 1]
            //if they give multiple voice channels, the last is always the destination
            if (voiceChannels.length > 1) {
                const voice_channel_members = extractVCMembers(voiceChannels.slice(0, voiceChannels.length - 1))
                if (Array.isArray(voice_channel_members))
                    voice_channel_members.forEach((ch) => (members = members.concat(ch)))
                else members = members.concat(voice_channel_members)
            }
        }

        return {
            members: members,
            voiceChannels: voiceChannels,
            textChannels: textChannels,
            moveChannel: moveChannel,
        }
    }

    /* the prompting for things like the name and the other shit should be defined here and then the args in should be
        defined as just the single that is just called args. 
        each method header then can define an interface that the args should follow and that can then be used for 
        type safety!
    */
}

export namespace LinkUtil {
    export namespace Prompt {
        export interface promptLinkArgs {
            type: Link.LinkTypes
            userID: string
            textChannel: MessageChannel
            currentLink?: ILinkDoc
        }

        export async function promptLink(args: promptLinkArgs): Promise<string> {
            try {
                const regex = args.type === Link.LinkTypes.link ? linkRegex : youtubeRegex

                const m = await MPrompt.getSameUserInput(
                    args.userID,
                    args.textChannel,
                    'Enter the link:',
                    Filter.regexFilter(regex)
                )

                return m.content.trim()
            } catch (error) {
                throw error
            }
        }

        export async function promptAddNames(args: promptLinkArgs): Promise<string[]> {
            try {
                const m = await MPrompt.getSameUserInput(
                    args.userID,
                    args.textChannel,
                    'Enter the names for the link:',
                    Filter.anyFilter()
                )

                return m.content.trim().split(' ')
            } catch (error) {
                throw error
            }
        }

        export async function promptDeleteNames(args: promptLinkArgs): Promise<string[]> {
            try {
                if (!args.currentLink) {
                    throw new Error('No link found')
                }

                const offset = 1
                const currentNames = args.currentLink.names
                const names = await MPrompt.arraySelect(
                    args.userID,
                    args.textChannel,
                    args.currentLink.names,
                    (x, i) => `\n${offset + i}: ${x}`,
                    'Select a name to delete',
                    {
                        multiple: true,
                        customOffset: offset,
                    }
                )
                if (!Array.isArray(names)) {
                    throw new Error('Expected an array')
                } else {
                    return names
                }
            } catch (error) {
                throw error
            }
        }

        export async function promptVolume(args: promptLinkArgs): Promise<number> {
            try {
                const m = await MPrompt.getSameUserInput(
                    args.userID,
                    args.textChannel,
                    `Enter the volume (0 to 1, ${
                        args.currentLink ? `currently: ${args.currentLink.volume}` : `default is .5)`
                    })`,
                    Filter.numberRangeFilter(0, 1, { integerOnly: false })
                )

                return Number.parseFloat(m.content.trim())
            } catch (error) {
                throw error
            }
        }
    }
}

export namespace MovieUtil {
    export async function selectMovie(
        guildID: string,
        userID: string,
        textChannel: MessageChannel,
        multiple = false,
        voteAllowed = false
    ) {
        try {
            let extraStringOptions = []
            if (voteAllowed) extraStringOptions.push(vote)
            const { movies, message } = await Movie.getMovies(guildID, [], true)
            const movie = await MPrompt.arraySelect(
                userID,
                textChannel,
                movies,
                (x: IMovieDoc) => `${x.name}`,
                'Select a movie',
                {
                    multiple: multiple,
                    customOffset: 1,
                    extraStringOptions: extraStringOptions,
                }
            )

            return movie
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function notifyUsersRequestFulfilled(movieRequested: IMovieRequestDoc, client: Client, guild: GuildD) {
        const userIDs = movieRequested.users

        const users = userIDs.map((x) => client.users.resolve(x))

        users.forEach((user) => {
            if (user != null) {
                user.send(`${movieRequested.name} has been added in ${guild.name}`)
            }
        })
    }

    export async function getInfoPage(movieName: string): Promise<string | null> {
        const urlBase = 'https://letterboxd.com'
        const searchBase = '/search/'

        const searchURL = encodeURI(urlBase + searchBase + movieName)

        return new Promise((resolve, reject) => {
            axios
                .get(searchURL)
                .then((response) => {
                    const html = response.data
                    const $ = cheerio.load(html)

                    const liResults = $('ul.results li div[data-film-link]')
                    liResults.length < 1 ? resolve(null) : resolve(urlBase + liResults.first().attr('data-film-link'))
                })
                .catch((err) => {
                    resolve(null)
                })
        })
    }

    export async function getMovieDuration(letterboxdLink: string): Promise<string | null> {
        const listResponse = await axios.get(letterboxdLink)
        const html = listResponse.data
        const $ = cheerio.load(html)

        const pTag = $('p.text-link')
        //@ts-ignore
        const pNode = pTag[0].children[0]
        //@ts-ignore
        const mins = parseInt(/(\d*)\s*mins/.exec(pNode.data.trim())[1])

        const hours = Math.floor(mins / 60)
        const minutes = mins % 60

        return `${hours} hours ${minutes} minutes`
    }

    export async function createMovieRole(movie: IMovieDoc, guild: GuildD): Promise<Role> {
        try {
            const reason = `vvn1: to watch ${movie.name}`
            const movieWatchers = movie.want_to_watch
                .map((x) => guild.member(x))
                .filter((x) => x != null) as GuildMember[]

            const newRole = await guild.roles.create({
                data: {
                    name: movie.name,
                    color: 'BLUE',
                    permissions: 0,
                },
                reason: reason,
            })

            movieWatchers.forEach(async (member) => {
                await member.roles.add(newRole, reason)
            })

            return newRole
        } catch (error) {
            throw error
        }
    }

    export namespace Config {
        export interface MovieConfigArgs {
            guildID: string
            userID: string
            textChannel: MessageChannel
            currentMovie: IMovieContainerDoc
            emojiDBName?: string
        }
    }

    export namespace Prompt {
        export interface promptMovieArgs {
            userID: string
            textChannel: MessageChannel
            guildID: string
        }

        export async function promptMovieLink(args: promptMovieArgs): Promise<string> {
            try {
                const m = await MPrompt.getSameUserInput(
                    args.userID,
                    args.textChannel,
                    'Enter the movie link:',
                    Filter.regexFilter(linkRegex)
                )

                return m.content.trim()
            } catch (error) {
                throw error
            }
        }

        export async function promptMovieName(args: promptMovieArgs): Promise<string> {
            try {
                const m = await MPrompt.getSameUserInput(
                    args.userID,
                    args.textChannel,
                    'Enter the movie name:',
                    Filter.anyFilter()
                )

                return m.content.trim()
            } catch (error) {
                throw error
            }
        }

        export async function promptMoviePassword(args: promptMovieArgs): Promise<string> {
            try {
                const options: MPrompt.optionSelectElement[] = [
                    { name: 'Default password', function: defaultPassword },
                    { name: 'Enter custom password', function: customPassword },
                    { name: 'No password', function: noPassword },
                ]
                const m = await MPrompt.optionSelect(args.userID, args.textChannel, options)

                return m

                async function defaultPassword(): Promise<string> {
                    try {
                        return await Movie.getMovieDefaultPassword(args.guildID)
                    } catch (error) {
                        throw error
                    }
                }

                async function customPassword(): Promise<string> {
                    try {
                        const m = await MPrompt.getSameUserInput(
                            args.userID,
                            args.textChannel,
                            'Enter the zip file password: ',
                            Filter.anyFilter()
                        )

                        return m.content.trim()
                    } catch (error) {
                        throw error
                    }
                }

                async function noPassword(): Promise<string> {
                    return ''
                }
            } catch (error) {
                throw error
            }
        }
    }
}

export namespace ConfigUtil {
    export interface ConfigUtilFunctionArgs {
        guildID: string
        guild: GuildD
        client: Client
        currentConfig: IConfigDoc
        textChannel: MessageChannel
        userID: string
        autoDeleteType?: Config.AutoDeleteType
        matchOn?: string
        lastFunction?: Function
    }

    export async function setNewPrefix(args: ConfigUtilFunctionArgs) {
        try {
            const m = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                `Please enter the new prefix (currently ${args.currentConfig.prefix}): `,
                Filter.stringLengthFilter(1, 0)
            )
            await Config.setPrefix(args.guildID, m.content.trim(), args.textChannel)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function setNewTimeZone(args: ConfigUtilFunctionArgs) {
        try {
            const offset = 1
            const countries = moment.tz.countries()

            const countryPrompt = `Select a country code:\n${countries.map((x, i) => `${i + offset}. ${x}`).join('\n')}`

            const countryMessage = await MPrompt.arraySelect(
                args.userID,
                args.textChannel,
                countries,
                (x, i) => `${i + offset}. ${x}`,
                'Select a new time zone',
                {
                    multiple: false,
                    customOffset: offset,
                }
            )

            if (!countryMessage.arrayElement) {
                throw new Error('Got an array when I should not have from arraySelect')
            }

            const country = countryMessage.arrayElement

            const arr = moment.tz.zonesForCountry(country, true)

            const m = await MPrompt.arraySelect(
                args.userID,
                args.textChannel,
                arr,
                (x, i) => `${i + offset}: ${x.name}, ${x.offset}`,
                'Select a new time zone',
                {
                    multiple: false,
                    customOffset: offset,
                }
            )

            if (!m.arrayElement) {
                throw new Error('Got an array when I should not have from arraySelect')
            }

            await Config.setTimeZone(args.guildID, m.arrayElement, args.textChannel)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    // want to change the schema for this sort of stuff so you have control over like the
    // delte this prefix if the message starts with <blank>, has whitelist and blacklist,
    // control time to delete based on what it matches
    // or delete message from user after timer if also starts with prefix?
    // idk more configurable would be cool
    // also having an all bots autodelete after 1 min or something could be hype

    export async function setPrefixAutoDelete(args: ConfigUtilFunctionArgs) {
        args.autoDeleteType = Config.AutoDeleteType.prefix
        setAutoDelete(args)
    }

    export async function setUserAutoDelete(args: ConfigUtilFunctionArgs) {
        args.autoDeleteType = Config.AutoDeleteType.user
        setAutoDelete(args)
    }
    export async function setAutoDelete(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            args.matchOn = undefined
            args.lastFunction = setAutoDelete

            const options: MPrompt.optionSelectElement[] = [
                { name: `Add new ${args.autoDeleteType}`, function: addTypeAutoDelete, args: args },
                {
                    name: `Edit exiting ${args.autoDeleteType} settings`,
                    function: editTypeAutoDelete,
                    args: args,
                },
                { name: `Remove ${args.autoDeleteType}`, function: removeTypeAutoDelete, args: args },
            ]

            return MPrompt.optionSelect(args.userID, args.textChannel, options)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }
    export async function addTypeAutoDelete(args: ConfigUtilFunctionArgs) {
        try {
            const prefixMode = args.autoDeleteType == Config.AutoDeleteType.prefix
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }

            const filter = prefixMode ? Filter.anyFilter() : Filter.validUserFilter(args.guild)
            const m = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                `Enter the ${args.autoDeleteType} to autodelete messages for:`,
                filter
            )

            const config = await Config.getGuildConfig(args.guildID)
            if (prefixMode) {
                args.matchOn = m.content.trim()
                const foundPrefix = config.autodelete.find(
                    (x) => x.matchOn === args.matchOn && x.type == Config.AutoDeleteType.prefix
                )
                if (!foundPrefix) {
                    // new prefix, add and then go to the edit move
                    await Config.addAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType, args.textChannel)
                }
            } else {
                const users = extractActiveUsers(m.content.trim(), args.guild)
                if (users.length < 1) throw new Error('No user found')
                args.matchOn = users[0].id
                const foundUser = config.autodelete.find(
                    (x) => x.matchOn === args.matchOn && x.type == Config.AutoDeleteType.user
                )
                if (!foundUser) {
                    await Config.addAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType, args.textChannel)
                }
            }

            return editTypeAutoDelete(args)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function selectAutoDeleteTypeMember(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            const configDoc = await Config.getGuildConfig(args.guildID)
            const typedAutoDeleteArr = configDoc.autodelete.filter((x) => x.type == args.autoDeleteType)
            const offset = 1

            if (typedAutoDeleteArr.length < 1) {
                sendToChannel(args.textChannel, `No ${args.autoDeleteType} elements found. Quitting...`)
                if (args.lastFunction) {
                    return args.lastFunction(args)
                }
            }

            const prompt = `Select a ${args.autoDeleteType} to edit:\n ${typedAutoDeleteArr
                .map(
                    (x, i) =>
                        `${i + offset}. ${
                            args.autoDeleteType == Config.AutoDeleteType.user
                                ? args.guild.members.resolve(x.matchOn)?.displayName
                                : x.matchOn
                        }`
                )
                .join('\n')}`
            const element = await MPrompt.arraySelect(
                args.userID,
                args.textChannel,
                typedAutoDeleteArr,
                (x, i) =>
                    `${i + offset}. ${
                        args.autoDeleteType == Config.AutoDeleteType.user
                            ? args.guild.members.resolve(x.matchOn)?.displayName
                            : x.matchOn
                    }`,
                'Select auto delete member',
                {
                    multiple: false,
                    customOffset: offset,
                }
            )

            if (element.arrayElement) {
                return element.arrayElement
            } else {
                const msg = 'Error selecting element. Quitting...'
                await sendToChannel(args.textChannel, msg)
                throw new Error(msg)
            }
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function editTypeAutoDelete(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            let elementDoc: IAutoDeleteElement | undefined
            if (!args.matchOn) {
                elementDoc = await selectAutoDeleteTypeMember(args)
                if (elementDoc) {
                    args.matchOn = elementDoc.matchOn
                }
            }
            if (elementDoc == undefined) {
                if (!args.matchOn) {
                    throw new Error('Coulndnt set autodelete element')
                }
                elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            }

            if (!elementDoc) {
                sendToChannel(args.textChannel, `${args.autoDeleteType} not loaded in for whatever reason. Quitting...`)
                return undefined
            }

            const backFn = args.lastFunction ? args.lastFunction : () => true

            args.lastFunction = setAutoDelete

            const deleteModeString =
                'Currently in delete mode, meaning the default is to delete messages and will not delete messages that start with the whitelist'
            const allowModeString =
                'Currently in allow mode, meaning that the default is to allow messages and will delete messages that are mentioned on the whitelist'
            const options: MPrompt.optionSelectElement[] = [
                {
                    name: `Edit whitelisted commands. If in allow mode, deletes the command. If in delete mode, allows the command`,
                    function: editAllowList,
                    args: args,
                },
                {
                    name: `Edit specified command delete times (ex. ${
                        Config.AutoDeleteType.prefix == args.autoDeleteType
                            ? '!play deletes after 300 seconds'
                            : 'when user Gerald says play delete it'
                    })`,
                    function: editSpecifiedDelete,
                    args: args,
                },
                {
                    name: `Change mode. ${elementDoc.allowMode ? allowModeString : deleteModeString}`,
                    function: changeAutoDeleteMode,
                    args: args,
                },
                {
                    name: `Edit default delete time (currently ${
                        elementDoc.defaultDeleteTime / NumberConstants.secs
                    } seconds)`,
                    function: editDefaultDeleteTime,
                    args: args,
                },
                { name: 'Back', function: backFn, args: args },
            ]

            return MPrompt.optionSelect(args.userID, args.textChannel, options)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function editDefaultDeleteTime(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) throw new Error('No matchOn')
            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) return undefined

            const m = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                'Enter the new default delete time in seconds',
                Filter.numberRangeFilter(0, Number.MAX_SAFE_INTEGER)
            )

            const time = Number.parseInt(m.content.trim()) * NumberConstants.secs

            await Config.changeAutoDeleteElementDefaultTime(args.guildID, elementDoc, time, args.textChannel)

            editTypeAutoDelete(args)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function changeAutoDeleteMode(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) throw new Error('No matchOn')
            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) return undefined
            await Config.changeAutoDeleteElementMode(args.guildID, elementDoc, args.textChannel)

            editTypeAutoDelete(args)
        } catch (error) {
            throw error
        }
    }
    export async function removeTypeAutoDelete(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            const elementDoc = await selectAutoDeleteTypeMember(args)
            if (!elementDoc) {
                return undefined
            }
            args.matchOn = elementDoc.matchOn

            if (!args.matchOn) {
                return undefined
            } else {
                await Config.deleteAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType, args.textChannel)
                args.matchOn = undefined
                setAutoDelete(args)
            }
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }
    export async function addAutoDeleteSpecified(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) {
                sendToChannel(args.textChannel, 'Error on my end. Quitting...')
                return undefined
            }

            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) {
                sendToChannel(args.textChannel, args.autoDeleteType + ' not loaded in for whatever reason. Quitting...')
                return undefined
            }

            // 2 prompt. one for the name of the command and then how many seconds to wait before deletion

            const commandMessage = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                'Enter the name of the command:',
                Filter.anyFilter()
            )

            const commandStr = commandMessage.content.trim()

            const timeMessage = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                'Enter the amount of seconds before deleting:',
                Filter.numberRangeFilter(0, Number.MAX_SAFE_INTEGER)
            )

            const timeToDelete = parseInt(timeMessage.content.trim())

            const autodeleteSpecified: IAutoDeleteSpecified = { startsWith: commandStr, timeToDelete: timeToDelete }
            await Config.addAutoDeleteElementSpecified(
                args.guildID,
                args.matchOn,
                args.autoDeleteType,
                autodeleteSpecified,
                args.textChannel
            )

            editSpecifiedDelete(args)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function removeSpecifiedDelete(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) {
                sendToChannel(args.textChannel, 'Error on my end. Quitting...')
                return undefined
            }

            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) {
                sendToChannel(args.textChannel, 'Error on my end. Quitting...')
                return undefined
            }

            const arr = elementDoc.specified

            const offset = 1

            const specifiedObj = await MPrompt.arraySelect(
                args.userID,
                args.textChannel,
                arr,
                (x, i) => `${i + offset}. ${x.startsWith} after ${x.timeToDelete} seconds`,
                'Select element to delete',
                {
                    customOffset: 1,
                    multiple: false,
                }
            )

            if (!specifiedObj.arrayElement) {
                return undefined
            }

            Config.removeAutoDeleteElementSpecified(
                args.guildID,
                elementDoc,
                specifiedObj.arrayElement,
                args.textChannel
            )
        } catch (error) {
            throw error
        }
    }
    export async function editSpecifiedDelete(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) {
                sendToChannel(
                    args.textChannel,
                    'Error on my end. Prefix not passsed in for whatever reason. Quitting...'
                )
                return undefined
            }

            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) {
                sendToChannel(args.textChannel, 'Prefix not loaded in for whatever reason. Quitting...')
                return undefined
            }

            const extraPrompt =
                'Current configuration:\n' +
                elementDoc.specified
                    .map((x) => `${elementDoc.matchOn + x.startsWith} after ${x.timeToDelete} seconds`)
                    .join('\n')

            const backFn = args.lastFunction ? args.lastFunction : () => true

            args.lastFunction = editSpecifiedDelete
            const options: MPrompt.optionSelectElement[] = [
                {
                    name: 'Add/Edit command name to specify a delete time for',
                    function: addAutoDeleteSpecified,
                    args: args,
                },
                {
                    name: `Delete an existing command's specific delete time`,
                    function: removeSpecifiedDelete,
                    args: args,
                },
                { name: 'Back', function: backFn, args: args },
            ]

            MPrompt.optionSelect(args.userID, args.textChannel, options, { extraPrompt: extraPrompt })
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    // allow list
    export async function editAllowList(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) {
                sendToChannel(
                    args.textChannel,
                    'Error on my end. Prefix not passsed in for whatever reason. Quitting...'
                )
                return undefined
            }

            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) {
                sendToChannel(args.textChannel, 'Prefix not loaded in for whatever reason. Quitting...')
                return undefined
            }

            //  display current allow list
            const backFn = args.lastFunction ? args.lastFunction : () => true
            args.lastFunction = editTypeAutoDelete
            const extraPrompt = `Current list includes: ${elementDoc.allowList.join(', ')}`

            const options: Prompt.optionSelectElement[] = [
                {
                    name: 'Add to allow list',
                    function: addToAllowList,
                    args: args,
                },
                {
                    name: 'Remove from allow list',
                    function: removeFromAllowList,
                    args: args,
                },
                { name: 'Back', function: backFn, args: args },
            ]

            return MPrompt.optionSelect(args.userID, args.textChannel, options, {
                extraPrompt: extraPrompt,
            })
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function addToAllowList(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) {
                sendToChannel(
                    args.textChannel,
                    'Error on my end. Prefix not passsed in for whatever reason. Quitting...'
                )
                return undefined
            }

            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) {
                sendToChannel(args.textChannel, 'Prefix not loaded in for whatever reason. Quitting...')
                return undefined
            }

            const m = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                'Enter the names you would like to whitelist (can add multiple with spaces for commas between):',
                Filter.anyFilter()
            )

            const names = m.content.trim().split(spaceCommaRegex)

            await Config.addAutoDeleteElementAllowed(args.guildID, elementDoc, names, args.textChannel)

            editAllowList(args)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function removeFromAllowList(args: ConfigUtilFunctionArgs) {
        try {
            if (args.autoDeleteType == undefined) {
                throw new Error('No type of autodelete')
            }
            if (!args.matchOn) {
                sendToChannel(
                    args.textChannel,
                    'Error on my end. Prefix not passsed in for whatever reason. Quitting...'
                )
                return undefined
            }

            const elementDoc = await Config.getAutoDeleteElement(args.guildID, args.matchOn, args.autoDeleteType)
            if (!elementDoc) {
                sendToChannel(args.textChannel, 'Prefix not loaded in for whatever reason. Quitting...')
                return undefined
            }

            const allowList = elementDoc.allowList
            const offset = 1

            const deleteNames = await MPrompt.arraySelect(
                args.userID,
                args.textChannel,
                allowList,
                (x, i) => `${i + offset}. ${x}\n`,
                'Select element to remove',
                {
                    multiple: true,
                    customOffset: 1,
                }
            )

            if (!Array.isArray(deleteNames)) {
                return undefined
            }

            await Config.removeAutoDeleteElementAllowed(args.guildID, elementDoc, deleteNames, args.textChannel)

            editTypeAutoDelete(args)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    // user auto delete

    export async function messageArchiveConfig(args: ConfigUtilFunctionArgs) {
        try {
            const backFn = args.lastFunction ? args.lastFunction : () => true
            args.lastFunction = messageArchiveConfig

            const messageArchive = await Config.getArchiveConfig(args.guildID)
            let options: Prompt.optionSelectElement[] = [
                {
                    name: 'Create new archive channel',
                    function: createArchiveConfig,
                    args: args,
                },
                {
                    name: 'Select extisting channel as archive channel',
                    function: editArchiveChannel,
                    args: args,
                },
            ]
            if (messageArchive.channel != '')
                options = options.concat([
                    {
                        name: `${messageArchive.enabled ? 'Disable' : 'Enable'} the message archive`,
                        function: toggleMessageArchive,
                        args: args,
                    },
                    {
                        name: `Save bot messages: Curently ${
                            messageArchive.save_bot_commands ? 'enabled' : 'disabled'
                        }`,
                        function: toggleArchiveSaveBotMessages,
                        args: args,
                    },
                ])

            options.push({ name: 'Back', function: backFn, args: args })

            return MPrompt.optionSelect(args.userID, args.textChannel, options)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function createArchiveConfig(args: ConfigUtilFunctionArgs) {
        try {
            const channel = await args.guild.channels.create('Archive', { type: 'text' })
            sendToChannel(args.textChannel, 'Please set the channel permissions')

            return Config.setMessageArchiveChannel(args.guildID, channel.id, args.textChannel)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function editArchiveChannel(args: ConfigUtilFunctionArgs) {
        try {
            const m = await MPrompt.getSameUserInput(
                args.userID,
                args.textChannel,
                'Enter the id of the text channel that you want to be the archive channel',
                Filter.validChannelFilter(args.guild, 'text')
            )
            const channelID = m.content.trim()

            return Config.setMessageArchiveChannel(args.guildID, channelID, args.textChannel)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }

    export async function toggleMessageArchive(args: ConfigUtilFunctionArgs) {
        try {
            return Config.toggleMessageArchiveMode(args.guildID, args.textChannel)
        } catch (error) {
            throw error
        }
    }

    export async function toggleArchiveSaveBotMessages(args: ConfigUtilFunctionArgs) {
        try {
            return Config.toggleArchiveSaveBotMessages(args.guildID, args.textChannel)
        } catch (error) {
            throw error
        }
    }
}

export namespace EmojiUtil {
    export async function validateEmoji(cache: Collection<string, GuildEmoji>, emojiDoc: IReactionEmojiDoc) {
        const guildResults = guildEmojiRegex.exec(emojiDoc.emoji)
        if (guildResults) {
            const guildEmoji = cache.find((x) => x.name == guildResults[1])

            if (guildEmoji) return guildEmoji
            else return emojiDoc.backup
        } else {
            return emojiDoc.emoji
        }
    }

    /**
     * Checks if the input string is a valid emoji.
     *
     * Looks for a valid formatted emoji.
     * Also is for seeing if it is a valid one for what we are looking for.
     *
     * @param {String}  name        The name of the emoji that was input.
     * @param {Emoji}   validArr   The array of valid emojis.
     * @returns {Boolean}   If it is a valid emoji for the situation.
     */
    export function isEmoji(name: string, validArr: any[]) {
        const moji = emoji.find(name)
        if (moji) {
            const mojiColon = `:${moji.key}:`
            return validArr.includes(mojiColon)
        }
        return false
    }

    /**
     * Filter function for getting  emojis of a specified type from a collection.
     *
     * This is best used when having an emoji collector and filtering those results.
     *
     * @param {[Emoji]} goodEmojis Valid emojis that will be filtered true.
     */
    export function filterEmoji(goodEmojis: (GuildEmoji | string)[]) {
        return (x: any) => {
            const moji = x.emoji
            if (isEmoji(moji.name, goodEmojis)) return true
            if (goodEmojis.includes(moji)) return true
            return false
        }
    }

    export function emojiIDToString(emojiID: string, guild: GuildD) {
        let input_emoji = undefined

        if (emoji.find(emojiID)) {
            input_emoji = `:${emoji.find(emojiID).key.replace('-', '_')}:`
        } else if (guildEmojiRegex.test(emojiID)) {
            input_emoji = emojiID
        } else {
            const guild_emoji = guild.emojis.cache.find((x) => x.name == emojiID)
            if (guild_emoji) input_emoji = `<:${guild_emoji.identifier}>`
        }

        return input_emoji
    }
}
