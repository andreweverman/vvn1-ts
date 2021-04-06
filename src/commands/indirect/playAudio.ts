import { VoiceChannel } from 'discord.js'
import { ILinkDoc } from '../../db/models/guildModel'
import { Player } from '../../db/controllers/guildController'
import { sendToChannel, MessageChannel } from '../../util/messageUtil'
import ytdl from 'ytdl-core'
import { NumberConstants } from '../../util/constants'

const execute = async function (voiceChannel: VoiceChannel, clip: ILinkDoc, textChannel: MessageChannel) {
    try {
        const guildID = voiceChannel.guild.id
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

        dispatcher.on('speaking', (speaking) => {
            if (!speaking) {
                const timestamp = new Date()
                Player.updateLastVoiceActivity(guildID, textChannel.id, timestamp).catch((err) => {
                    throw err
                })

                setTimeout(async () => {
                    const player = await Player.getPlayer(guildID)
                    if (player.lastStreamingTime != timestamp) {
                        connection.disconnect()
                    }
                }, 15*NumberConstants.mins)
            }
        })
    } catch (error) {
        throw error
    }
}

export default execute
