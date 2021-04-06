import {
    Guild,
    GuildMember,
    GuildChannel,
    Client,
    User,
    VoiceChannel,
    TextChannel,
    GuildChannelResolvable,
    MessageReaction,
    MessageEmbed,
} from 'discord.js'
import { Alias } from '../db/controllers/guildController'

import { discordMemberID, discordUserAtRegex, validUserID } from './stringUtil'
import _ from 'lodash'
import { AliasUtil } from './generalUtil'
import { deleteMessage, MessageChannel, sendToChannel } from './messageUtil'
import { NumberConstants,ready } from './constants'
export interface ValidUserOptions {
    mustBeBot?: boolean
    mustBeHuman?: boolean
}
export function validGuildMember(content: string, client: Client, options?: ValidUserOptions): User[] {
    const users = content
        .trim()
        .split(' ')
        .map((x) =>
            client.users.cache.find((y) => {
                const idMatch = x == y.id
                if (options) {
                    if (options.mustBeBot != undefined && options.mustBeBot == true && !y.bot) return false
                    if (options.mustBeHuman != undefined && options.mustBeHuman == true && y.bot) return false
                }
                return idMatch
            })
        )
    const usersNoNull: User[] = []
    users.forEach((x) => {
        if (x) usersNoNull.push(x)
    })
    return usersNoNull
}

export function validUser(x: string, guild: Guild, options?: ValidUserOptions) {
    const userID = validUserID(x)
    if (!userID) return null
    const mem = guild.member(userID)
    if (mem && options) {
        if (options.mustBeBot != undefined && options.mustBeBot == true && !mem.user.bot) return null
        if (options.mustBeHuman != undefined && options.mustBeHuman == true && mem.user.bot) return null
    }
    return mem
}

// TODO: change this so it uses the client resolver?
export function extractActiveUsers(content: string, guild: Guild): GuildMember[] {
    const members = content
        .trim()
        .split(' ')
        .map((x) => validUser(x, guild))
    const membersNoNull: GuildMember[] = []
    members.forEach((x) => {
        if (x != null) membersNoNull.push(x)
    })
    return membersNoNull
}

export function extractChannels(content: string, guild: Guild): GuildChannel[] {
    const channels = content
        .trim()
        .split(' ')
        .map((x: string) => guild.channels.resolve(x))
    const channelsNoNull: GuildChannel[] = []
    channels.forEach((x) => {
        if (x != null) channelsNoNull.push(x)
    })
    return channelsNoNull
}

export function extractVCMembers(channel: GuildChannel | GuildChannel[]): GuildMember[] {
    if (Array.isArray(channel)) {
        return _.flattenDeep(channel.map((ch: GuildChannel) => Array.from(ch.members.entries()).map((x) => x[1])))
    }
    return Array.from(channel.members.entries()).map((x) => x[1])
}

export function moveMembers(targetChannel: GuildChannelResolvable, members: GuildMember[]): Promise<GuildMember[]> {
    return new Promise((resolve, reject) => {
        const moves = []

        for (let member of members) {
            if (member.voice.channel != null) {
                moves.push(member.voice.setChannel(targetChannel))
            }
        }

        Promise.all(moves)
            .then((x) => {
                resolve(x)
            })
            .catch((err) => reject(err))
    })
}

export interface VoiceChannelResolve {
    voiceChannels?: VoiceChannel[]
    moveChannel?: VoiceChannel
}
export async function getVoiceChannelFromAliases(
    guild: Guild,
    voiceChannelNames: string[],
    moveMode: boolean
): Promise<VoiceChannelResolve | null> {
    try {
        const { voiceChannels, moveChannel } = await AliasUtil.parseChannelsAndMembers(guild, voiceChannelNames, {
            moveMode: moveMode,
        })
        if (moveChannel) {
            return { moveChannel: moveChannel }
        } else if (voiceChannels.length > 0) {
            return { voiceChannels: voiceChannels }
        } else return null
    } catch (error) {
        throw error
    }
}

export async function readyCheck(guild:Guild,textChannel: MessageChannel, voiceChannel: VoiceChannel, waitTime = 1) {
    const ready_members: any[] = []

    const msg = new MessageEmbed()
        .setTitle('Ready Check')
        .addField('Instructions', 'React to this message when fully ready to go.', false)

    const instr_msg = await textChannel.send(msg).catch((err) => {
        console.error(err)
        return Promise.reject('Error sending')
    })

    const filter = (reaction: MessageReaction, user: User) =>{
        const notAlreaadyReady =!ready_members.find((x) => user.id == x) 
        const guildMember = guild.member(user.id)
        const inVoice =  guildMember &&  guildMember.voice.channelID == voiceChannel.id
        return notAlreaadyReady && inVoice==true
    }
        // not in there already and in the voice channel we are checking

    return new Promise((resolve, reject) => {
        const reaction_collector = instr_msg.createReactionCollector(filter, {
            time: waitTime * NumberConstants.mins,
        })
        reaction_collector.on('collect', (reaction, user) => {
            ready_members.push(user)

            let vc_people =extractVCMembers(voiceChannel)
            let vcIDs = vc_people.filter((x) => !x.user.bot).map((x) => x.id)

            if (vcIDs.every((x:any) => ready_members.find((y) => x == y))) {
                reaction_collector.stop(ready)
            }
        })

        reaction_collector.on('end', (collected, reason) => {
            deleteMessage(instr_msg, 0)
            reason == ready ? resolve(ready) : resolve(null)
        })
    })
}
