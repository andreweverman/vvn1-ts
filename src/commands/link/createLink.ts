/**
 * Creates a link alias for a user/channel in mongo 
 * 
 * Either is a link or a clip
 * A link is a static link that is just input to the chat
 * A clip is a youtube video that will have its audio played in a voice channel
 * 
 * @file   Creates link in mongo
 * @author Andrew Everman.
 * @since  16.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { Prompt  } from '../../util/messageUtil'
import { Link } from '../../db/controllers/guildController'
import { ILink } from '../../db/models/guildModel'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/stringUtil'
import { LinkUtil } from '../../util/generalUtil'
const command: commandProperties = {
    name: 'createlink',
    aliases: ['addlink'],
    args: false,
    description: 'Creates dynamic commands for linking websites or playing youtube clips',
    usage: `Use createlink for the bot to save a youtube video to broadcast or an alias to a specific link.\n, then follow the prompts`,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        interface linkType {
            name: Link.LinkTypes
            description: string
            regex: RegExp
            volumePrompt: boolean
        }

        const options: linkType[] = [
            {
                name: Link.LinkTypes.link,
                description: 'Static link that gets returned when invoked by name',
                regex: linkRegex,
                volumePrompt: false,
            },
            {
                name: Link.LinkTypes.clip,
                description: 'A youtube link that gets played in a voice channel',
                regex: youtubeRegex,
                volumePrompt: true,
            },
        ]

        try {
            let linkType: linkType
            let type: Link.LinkTypes
            let names: string[]
            let link: string
            let volume: number | undefined
            linkType = await promptType()
            type = linkType.name
            const args = {
                type: linkType.name,
                userID: userID,
                textChannel: textChannel,
            }

            link = await LinkUtil.Prompt.promptLink(args)
            names = await LinkUtil.Prompt.promptAddNames(args)

            if (type === Link.LinkTypes.clip) {
                volume = await LinkUtil.Prompt.promptVolume(args)
            }

            const linkObj: ILink = {
                names: names,
                link: link,
                type: type,
                uploader: e.message.author.id,
                volume: volume,
            }
            await Link.createLink(guildID, linkObj, textChannel)
            return true
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }

        async function promptType(): Promise<linkType> {
            return new Promise((resolve, reject) => {
                try {

                    Prompt.arraySelect(userID, textChannel, options, (x) => `${x.name}, ${x.description}`, 'Select a type')
                        .then((option) => {
                            if (!option.arrayElement) {
                                reject(null)
                                return
                            }
                            resolve(option.arrayElement)
                        })
                        .catch((error) => {
                            reject(error)
                        })
                } catch (error) {
                    throw error
                }
            })
        }
    },
}

export default command
