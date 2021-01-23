import { Message, Collection, Client, Guild as GuildD, MessageEmbed, TextChannel, PartialMessage } from 'discord.js'
import { commandCollection, commandCooldowns } from '../bot'
import { NumberConstants } from '../util/constants'
import { deleteMessage, MessageChannel, replyUtil, sendToChannel } from '../util/message.util'
import { Config, Link, Guild } from '../db/controllers/guild.controller'
import playAudio from '../commands/indirect/playAudio'
import { IConfigDoc } from '../db/models/guild.model'
import { ConfigUtil } from '../util/general.util'
async function guildCreate(guild: GuildD) {
    try {
        await Guild.getGuild(guild.id).catch((err) => {
            if (err == undefined) {
                Guild.initializeGuild(guild.id)
            }
        })
    } catch (error) {
        throw error
    }
}

export default guildCreate
