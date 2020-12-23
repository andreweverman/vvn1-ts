import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/message.util'
import { Link, Guild } from '../../db/controllers/guild.controller'
import { ILink } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { AliasUtil } from '../../util/general.util'

const command: commandProperties = {
    name: 'editlink',
    aliases: ['editclip'],
    args: false,
    description: 'Edit a link that exists in this server',
    usage: `Follow the prompts!`,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const link = await Link.selectLink(guildID, userID, textChannel, false)

            if (link == undefined || Array.isArray(link)) {
                return undefined
            }
            const linkOnly = link
            const args = {
                type: link.type,
                userID: userID,
                textChannel: textChannel,
            }

            const options: Prompt.optionSelectElement[] = [
                { name: 'Edit link url', function: editLinkUrl },
                { name: 'Add names', function: addNames },
                { name: 'Remove names', function: removeNames },
                { name: 'Edit volume ', function: editVolume },
            ]

            Prompt.optionSelect(userID, textChannel, options)

            async function editLinkUrl() {
                try {
                    const newLink = await AliasUtil.Prompt.promptLink(args)

                    await Link.updateLinkUrl(guildID, linkOnly, newLink, textChannel)
                } catch (error) {
                    throw error
                }
            }

            async function addNames() {
                try {
                    const names = await AliasUtil.Prompt.promptNames(args)

                    await Link.addNames(guildID, linkOnly, names, textChannel)
                } catch (error) {
                    throw error
                }
            }

            async function removeNames() {
                try {
                    const names = await AliasUtil.Prompt.promptNames(args)

                    await Link.removeNames(guildID, linkOnly, names, textChannel)
                } catch (error) {
                    throw error
                }
            }

            async function editVolume() {
                try {
                    const volume = await AliasUtil.Prompt.promptVolume(args)

                    await Link.editVolume(guildID, linkOnly, volume, textChannel)
                } catch (error) {
                    throw error
                }
            }
        } catch (error) {
            throw error
        }
    },
}

export default command
