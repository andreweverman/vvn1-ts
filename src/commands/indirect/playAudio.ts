/**
 * Plays youtube videos through the voice channel
 *
 * Plays a voice clip with params from mongo.
 * Bot then plays sound through discord
 * Plays from youtube.
 *
 *
 * @file   All logic for playing a youtube video through bot
 * @author Andrew Everman.
 * @since  16.7.2020
 */

import { VoiceChannel, StreamDispatcher } from 'discord.js'
import { ILinkDoc } from '../../db/models/guildModel'
import { Player } from '../../db/controllers/guildController'
import { sendToChannel, MessageChannel } from '../../util/messageUtil'
import ytdl from 'ytdl-core'
import { NumberConstants } from '../../util/constants'
import { getClipFiles, clipsPath } from '../../util/fiileUtil'
import fs from 'fs'
import { Readable } from 'stream'

const execute = async function (voiceChannel: VoiceChannel, clip: ILinkDoc, textChannel: MessageChannel) {
    try {
        const guildID = voiceChannel.guild.id
        if (!clip) {
            sendToChannel(textChannel, "Coudn't find clip", true)
            return
        }

        const connection = await voiceChannel.join()

        let playVal: Readable | string = ''

        // todo actually get if they are premium or not
        const premium = true
        if (premium) {
            const dlClip = findClip(clip)
            if (dlClip) {
                playVal = dlClip
            }
        }
        if (playVal == '') {
            playVal = ytdl(clip.link, { filter: 'audioonly' })
            let piper = ytdl(clip.link, { filter: 'audioonly' })

            if (premium) {
                if (!fs.existsSync(clipsPath)) {
                    fs.mkdirSync(clipsPath)
                }
                let filePath = `${clipsPath}/${justVEquals(clip.link)}.mp3`
                piper.pipe(fs.createWriteStream(filePath))
            }
        }
        const dispatcher = connection.play(playVal, { volume: clip.volume })

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
                }, 15 * NumberConstants.mins)
            }
        })
    } catch (error) {
        throw error
    }
}

function findClip(clip: ILinkDoc): string | undefined {
    const clipFiles = getClipFiles()
    if (clipFiles.length > 0) {
        const filePath = clipFiles.find((p) => p.end.includes(justVEquals(clip.link)))
        return filePath?.path
    }
    return undefined
}

function justVEquals(ytLink: string) {
    if (ytLink.includes('youtu.be')) {
        return ytLink.substring(ytLink.lastIndexOf('/'))
    } else {
        let regex = /.*?v=(.*)\?*/
        let res = regex.exec(ytLink)
        if (res) {
            return res[1]
        }
    }
    return ''
}

export default execute
