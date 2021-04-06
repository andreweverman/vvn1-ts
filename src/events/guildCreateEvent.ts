import { Message, Collection, Client, Guild as GuildD, MessageEmbed, TextChannel, PartialMessage } from 'discord.js'
import { commandCollection, commandCooldowns } from '../bot'
import { NumberConstants } from '../util/constants'
import { deleteMessage, MessageChannel, replyUtil, sendToChannel } from '../util/messageUtil'
import { Config, Link, Guild } from '../db/controllers/guildController'
import playAudio from '../commands/indirect/playAudio'
import { IConfigDoc } from '../db/models/guildModel'
import { ConfigUtil } from '../util/generalUtil'
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
