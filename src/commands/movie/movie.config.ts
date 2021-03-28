import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter, sendToChannel } from '../../util/message.util'
import { Link, Guild, Config, Movie, Alias } from '../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../db/models/guild.model'
import { MessageEmbed, VoiceChannel } from 'discord.js'
import { linkRegex, youtubeRegex, guildEmojiRegex } from '../../util/string.util'
import { MovieUtil, ConfigUtil } from '../../util/general.util'
import {
    movieCountdownName,
    movieTimeName,
    willWatchEmojiName,
    readyEmojiName,
    movieChannelAlias,
} from '../../util/constants'

const command: commandProperties = {
    name: 'movieconfig',
    description: 'Edit the movie configuration for this server',
    aliases: ['moviecfg'],
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            interface SoundEditArgs {
                name: string
                db: string
            }
            interface EmojiEditArgs {
                name: string
                db: string
            }
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const movieDoc = await Movie.getMovie(guildID)

            if (!movieDoc) {
                throw new Error('No no config doc')
            }

            const movieTimeDoc = await Movie.getSoundDoc(guildID, movieTimeName)
            const movieCountdownDoc = await Movie.getSoundDoc(guildID, movieCountdownName)
            const movieTimeArgs: SoundEditArgs = { name: 'Movie time', db: movieTimeName }
            const movieCountdownArgs: SoundEditArgs = { name: 'Start countdown', db: movieCountdownName }

            const currentMovieChannel = await Alias.lookupAlias(guildID, movieChannelAlias)

            const options: Prompt.optionSelectElement[] = [
                {
                    name: `Edit Movie Voice Channel. ${
                        currentMovieChannel != undefined ? 'Is Currently configured' : 'Not configured currently'
                    }`,
                    function: editVoiceChannel,
                },
                {
                    name: `Edit movie time sound (plays when the specified movie time has arrived)`,
                    function: editSoundLink,
                    args: movieTimeArgs,
                },
                {
                    name: `Edit movie start countdown sound (plays when ready check has passed)`,
                    function: editSoundLink,
                    args: movieCountdownArgs,
                },
                {
                    name: `${movieTimeDoc?.enabled ? 'Disable' : 'Enable'} movie time sound`,
                    function: toggleSound,
                    args: movieTimeArgs,
                },
                {
                    name: `${movieCountdownDoc?.enabled ? 'Disable' : 'Enable'} movie countdown sound`,
                    function: toggleSound,
                    args: movieCountdownArgs,
                },
                {
                    name: 'Edit will watch reaction emoji',
                    function: editReactionEmojis,
                    args: { name: 'Will watch', db: willWatchEmojiName },
                },
                {
                    name: 'Edit ready reaction emoji',
                    function: editReactionEmojis,
                    args: { name: 'Ready', db: readyEmojiName },
                },
                {
                    name: `Edit default zip file password (currently${movieDoc.default_password!=''?`: ${movieDoc.default_password}`:' is not set'})`,
                    function: editDefaultPassword,
                },
            ]
            async function editVoiceChannel() {
                try {
                    let voiceChannel: VoiceChannel | undefined
                    if (currentMovieChannel != undefined) {
                        let channel = e.message.guild!.channels.resolve(currentMovieChannel.id)
                        if (channel?.type == 'voice') {
                            voiceChannel = channel as VoiceChannel
                        }
                    }

                    const vcPrompt = voiceChannel
                        ? `The current voice channel is "${voiceChannel.name}" with id ${voiceChannel.id}. Enter the id of the channel you would like to change it to:`
                        : `Currently no voice channel set. Please enter the id of the voice channel you would like to set:`

                    const m = await Prompt.getSameUserInput(
                        userID,
                        textChannel,
                        vcPrompt,
                        Filter.validChannelFilter(e.message.guild!, Alias.Types.voice)
                    )

                    const newVCID = m.content.trim()

                    if (!currentMovieChannel) {
                        // creating alias
                        Alias.createAlias(
                            guildID,
                            { id: newVCID, type: Alias.Types.voice },
                            [movieChannelAlias],
                            textChannel
                        )
                    } else {
                        Alias.editAliasByName(guildID, movieChannelAlias, newVCID, Alias.Types.voice, textChannel)
                    }
                } catch (error) {
                    Prompt.handleGetSameUserInputError(error)
                }
            }

            async function editSoundLink(args: SoundEditArgs) {
                const m = await Prompt.getSameUserInput(
                    userID,
                    textChannel,
                    `Enter new ${args.name} link`,
                    Filter.regexFilter(youtubeRegex)
                )

                const newLink = m.content.trim()

                const oldLinkDoc = await Link.lookupLink(guildID, args.db)

                if (oldLinkDoc != undefined) {
                    Link.updateLinkUrl(guildID, oldLinkDoc, newLink, textChannel)
                } else {
                    // create link
                    Link.createLink(
                        guildID,
                        {
                            names: [args.db],
                            link: newLink,
                            uploader: e.message.author.id,
                            type: Link.LinkTypes.clip,
                        },
                        textChannel
                    )
                }
            }
            async function toggleSound(args: SoundEditArgs) {
                try {
                    Movie.toggleSoundDoc(guildID, args.db)
                } catch (error) {
                    throw error
                }
            }
            async function editReactionEmojis(args: EmojiEditArgs) {
                try {
                    const m = await Prompt.getSameUserInput(
                        userID,
                        textChannel,
                        `Enter the new guild emoji to be used for ${args.name}`,
                        Filter.validEmojiFilter()
                    )

                    const newEmoji = m.content.trim()

                    Movie.editReactionEmoji(guildID, m.guild!, args.db, newEmoji, textChannel)
                } catch (error) {
                    Prompt.handleGetSameUserInputError(error)
                }
            }

            async function editDefaultPassword() {
                const m = await Prompt.getSameUserInput(
                    userID,
                    textChannel,
                    'Enter new default movie password:',
                    Filter.anyFilter()
                )

                const newPassword = m.content.trim()

                return Movie.editDefaultPassword(guildID, newPassword, textChannel)
            }
            Prompt.optionSelect(userID, textChannel, options)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
