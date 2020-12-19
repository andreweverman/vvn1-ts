import { Guild, GuildMember, GuildChannel, Client, User } from "discord.js";


export function validGuildMember(content: string, client: Client): User[] {

    const users = content.trim().split(' ').map(x => client.users.cache.find(y => x==y.id));
    const usersNoNull: User[] = [];
    users.forEach((x) => {
        if (x != null) usersNoNull.push(x);
    })
    return usersNoNull
}

// TODO: change this so it uses the client resolver?
export function extractActiveUsers(content: string, guild: Guild): GuildMember[] {

    const members = content.trim().split(' ').map(x => guild.member(x))
    const membersNoNull: GuildMember[] = [];
    members.forEach(x => {
        if (x != null) membersNoNull.push(x)
    });
    return membersNoNull
}


export function extractChannels(content: string, guild: Guild): GuildChannel[] {
    const channels = content.trim().split(' ').map((x: string) => guild.channels.resolve(x))
    const channelsNoNull: GuildChannel[] = [];
    channels.forEach(x => {
        if (x != null) channelsNoNull.push(x)
    })
    return channelsNoNull
}