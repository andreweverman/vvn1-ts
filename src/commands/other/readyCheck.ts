import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter, sendToChannel } from '../../util/messageUtil'
import { Link, Guild, Config } from '../../db/controllers/guildController'
import { ILink, ILinkDoc } from '../../db/models/guildModel'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/stringUtil'
import { ConfigUtil } from '../../util/generalUtil'
import { replyUtil } from '../../util/messageUtil'
import { readyCheck } from '../../util/discordUtil'
const command: commandProperties = {
    name: 'readycheck',
    description: 'Ready checks a channel a command',
    aliases: ['ready'],
    guildOnly: true,
    usage: ', then follow the prompts',
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
