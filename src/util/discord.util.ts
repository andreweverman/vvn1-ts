import {
    Guild,
    GuildMember,
    GuildChannel,
    Client,
    User,
    VoiceChannel,
    TextChannel,
    GuildChannelResolvable,
} from 'discord.js'
import _ from 'lodash'

export function validGuildMember(content: string, client: Client): User[] {
    const users = content
        .trim()
        .split(' ')
        .map((x) => client.users.cache.find((y) => x == y.id))
    const usersNoNull: User[] = []
    users.forEach((x) => {
        if (x != null) usersNoNull.push(x)
    })
    return usersNoNull
}

// TODO: change this so it uses the client resolver?
export function extractActiveUsers(content: string, guild: Guild): GuildMember[] {
    const members = content
        .trim()
        .split(' ')
        .map((x) => guild.member(x))
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
