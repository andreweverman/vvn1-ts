import { GuildMember, VoiceChannel, TextChannel, Guild as GuildD, GuildChannel } from 'discord.js'
import { selfPronouns, groupPronouns } from '../util/constants'
import { Guild, Link, Movie } from '../db/controllers/guild.controller'
import { extractVCMembers } from '../util/discord.util'
import { linkRegex, youtubeRegex } from '../util/string.util'
import { Filter, Prompt as MPrompt, MessageChannel } from '../util/message.util'

export namespace AliasUtil {
    export interface parseChannelAndMembersResponse {
        members: GuildMember[]
        voiceChannels: GuildChannel[]
        textChannels: GuildChannel[]
        moveChannel?: GuildChannel
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
        const voiceChannels: GuildChannel[] = []
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
                channel.type == 'voice' ? voiceChannels.push(channel) : textChannels.push(channel)
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
                        obj && obj.type == alias.type ? voiceChannels.push(obj) : (bad_alias = true)
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

    export namespace Prompt {
        export interface promptLinkArgs {
            type: Link.LinkTypes
            userID: string
            textChannel: MessageChannel
        }

        export async function promptLink(args: promptLinkArgs): Promise<string> {
            try {
                const regex = args.type === Link.LinkTypes.link ? linkRegex() : youtubeRegex()

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

        export async function promptNames(args: promptLinkArgs): Promise<string[]> {
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

        export async function promptVolume(args: promptLinkArgs): Promise<number> {
            try {
                const m = await MPrompt.getSameUserInput(
                    args.userID,
                    args.textChannel,
                    'Enter the volume (0 to 1, default is .5)',
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
                    Filter.regexFilter(linkRegex())
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
