import { VoiceChannel } from 'discord.js'
import { ILinkDoc } from '../../db/models/guild.model'
import { sendToChannel, MessageChannel } from '../../util/message.util'
import ytdl from 'ytdl-core'

const execute = async function (voiceChannel: VoiceChannel, clip: ILinkDoc, textChannel: MessageChannel) {
    try {
        if (!clip) {
            sendToChannel(textChannel, "Coudn't find clip", true)
            return
        }

        const connection = await voiceChannel.join()

        const stream = ytdl(clip.link, { filter: 'audioonly' })

        const dispatcher = connection.play(stream, { volume: clip.volume })

        dispatcher.on('error', (e) => {
            throw e
        })
    } catch (error) {
        throw error
    }
}

export default execute
