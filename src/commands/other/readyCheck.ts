import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter, sendToChannel } from '../../util/message.util'
import { Link, Guild, Config } from '../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { ConfigUtil } from '../../util/general.util'
import { replyUtil } from '../../util/message.util'
import { readyCheck } from '../../util/discord.util'
const command: commandProperties = {
    name: 'readycheck',
    description: 'Ready checks a channel a command',
    aliases: ['ready'],
    guildOnly: true,
    usage: 'Follow the prompts!',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            if (e.message.member!.voice.channel == null) {
                replyUtil(e.message, 'Must be connected to voice to use this')
                return
            }
            const voiceChannel = e.message.member!.voice.channel

            await readyCheck(e.message.guild!,textChannel, voiceChannel).catch((err) => console.error(err))

            sendToChannel(textChannel, 'Ready check passed', true)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
