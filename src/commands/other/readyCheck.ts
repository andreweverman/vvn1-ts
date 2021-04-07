/**
 * Checks if users are ready.
 * 
 * A message is put in chat.
 * Users that are ready react to the message. 
 * 
 * @file   Cheks if users are ready
 * @author Andrew Everman.
 * @since  19.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { Prompt, sendToChannel } from '../../util/messageUtil'
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
