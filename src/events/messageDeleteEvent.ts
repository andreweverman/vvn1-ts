/**
 *
 * Event handler for when a message is deleted
 *
 * Handles the autodelete functionality for prefixes and users
 *
 * @file   Message delete event handler
 * @author Andrew Everman.
 * @since  29.10.2020
 */

import { Message, TextChannel, PartialMessage, MessageEmbed } from 'discord.js'
import { Config } from '../db/controllers/guildController'
async function messageEvent(message: Message | PartialMessage): Promise<string> {
    if (!message.guild) return 'Not guild message'
    const guildID = message.guild.id

    const configDoc = await Config.getGuildConfig(guildID)

    if (!configDoc || !configDoc.archive.enabled) return 'No config doc'
    const archiveDoc = configDoc.archive

    if (!archiveDoc.save_bot_commands && message.author!.bot) {
        return 'Bot and bot is not allowed'
    }

    const badPrefixes = configDoc.autodelete.filter((x) => x.type == Config.AutoDeleteType.prefix).map((x) => x.matchOn)
    const badUserIds = configDoc.autodelete.filter((x) => x.type == Config.AutoDeleteType.user).map((x) => x.matchOn)

    if (!badPrefixes.some((x) => message.content!.trim().startsWith(x)) || badUserIds.includes(message.author!.id)) {
        let image
        if (message.attachments.size > 0) {
            for (let [key, value] of message.attachments.entries()) {
                if (value.height) {
                    image = value.proxyURL
                }
            }
        }

        const content = message.content!.length > 0 ? message.content : null

        const archiveChannel = message.guild.channels.resolve(configDoc.archive.channel) as TextChannel

        if (!archiveChannel) return 'Archive channel is not valid'
        const msg = new MessageEmbed().addField(`From`, `${message.member}`)

        if (content) msg.addField('Content', message.cleanContent ? message.cleanContent : 'Nothing')
        if (image) msg.setImage(image)

        await archiveChannel.send({ embeds: [msg] })

        return 'Good'
    }
    return 'No need to return'
}

export default messageEvent
