/**
 *
 *  Utility for common discord API functionality
 *
 *  Defines the functionality for discord usage for:
 *      Checking for valid users and channels for IDs
 *      Moving Users
 *      Ready Checking
 *
 * @file   Defining common discord API functionality
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import {
    Guild,
    GuildMember,
    GuildChannel,
    Client,
    User,
    ThreadChannel,
    VoiceChannelResolvable,
} from 'discord.js'

import { validUserID } from './stringUtil'
import _ from 'lodash'
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
    const mem = guild.members.cache.get(userID)
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

export function extractChannels(content: string, guild: Guild) {
    const channels = content
        .trim()
        .split(' ')
        .map((x: string) => guild.channels.resolve(x))
    const channelsNoNull: (GuildChannel | ThreadChannel)[] = []
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

export function moveMembers(targetChannel: VoiceChannelResolvable, members: GuildMember[]): Promise<GuildMember[]> {
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


