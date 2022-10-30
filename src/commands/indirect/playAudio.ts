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

import { StageChannel, TextBasedChannels, VoiceChannel } from 'discord.js'
import { ILinkDoc } from '../../db/models/guildModel'
import { Player } from '../../db/controllers/guildController'
import { sendToChannel } from '../../util/messageUtil'
import ytdl from 'ytdl-core'
import { NumberConstants } from '../../util/constants'
import { getClipFiles, clipsPath, ensureDirExists } from '../../util/fiileUtil'
import fs from 'fs'
import { Readable } from 'stream'
import { IConfigDoc } from '../../db/models/guildModel'
import {
    AudioPlayerStatus,
    StreamType,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    JoinVoiceChannelOptions,
    CreateVoiceConnectionOptions
} from '@discordjs/voice'

const execute = async function (
    configDoc: IConfigDoc,
    voiceChannel: VoiceChannel | StageChannel,
    clip: ILinkDoc,
    textChannel: TextBasedChannels
) {
    try {
        const guildID = voiceChannel.guild.id
        if (!clip) {
            sendToChannel(textChannel, "Coudn't find clip", true)
            return
        }

        const options: JoinVoiceChannelOptions & CreateVoiceConnectionOptions = { channelId: voiceChannel.id, guildId: guildID, adapterCreator: voiceChannel.guild.voiceAdapterCreator as any }
        const connection = joinVoiceChannel(options)

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
            if (cacheClip) {
                const piper = ytdl(clip.link, { filter: 'audioonly' })
                ensureDirExists(clipsPath)
                let filePath = `${clipsPath}/${justVEquals(clip.link)}.mp3`
                piper.pipe(fs.createWriteStream(filePath))
            }
        }
        const resource = createAudioResource(playVal, { inputType: StreamType.Arbitrary })
        const player = createAudioPlayer();
        player.play(resource)
        connection.subscribe(player)

        player.on('error', (e: any) => {
            throw e
        })

        player.on(AudioPlayerStatus.Idle, (speaking: any) => {
            connection.destroy()
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
        return ytLink.substring(ytLink.lastIndexOf('/') + 1)
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
