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

import { VoiceChannel } from 'discord.js'
import { ILinkDoc } from '../../db/models/guildModel'
import { Player } from '../../db/controllers/guildController'
import { sendToChannel, MessageChannel } from '../../util/messageUtil'
import ytdl from 'ytdl-core'
import { NumberConstants } from '../../util/constants'
import { getClipFiles, clipsPath, ensureDirExists } from '../../util/fiileUtil'
import fs from 'fs'
import { Readable } from 'stream'
import { IConfigDoc } from '../../db/models/guildModel'


const execute = async function (
    configDoc: IConfigDoc,
    voiceChannel: VoiceChannel,
    clip: ILinkDoc,
    textChannel: MessageChannel
) {
    try {
        const guildID = voiceChannel.guild.id
        if (!clip) {
            sendToChannel(textChannel, "Coudn't find clip", true)
            return
        }

        const connection = await voiceChannel.join()

        let playVal: Readable | string = ''

        const cacheClip = configDoc.premium && process.env.CLIP_CACHE == '1'
        if (cacheClip) {
            const dlClip = findClip(clip)
            if (dlClip) {
                playVal = dlClip
            }
        }
        if (playVal == '') {
            /*
            I don't know if with the way that the discord thing is setup if I am able to reuse the stream in two spots.
            I don't think I am so I will make two streams for this one instance.
            Then it will be reused anyways to it is all good
            */
            playVal = ytdl(clip.link, { filter: 'audioonly' })
            const piper = ytdl(clip.link, { filter: 'audioonly' })
            if (cacheClip) {
                ensureDirExists(clipsPath)
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
