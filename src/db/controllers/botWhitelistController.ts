import BotWhitelist, { IBotWhitelistDoc } from '../models/botWhitelist'

export function getBotWhitelist(guildId: string, userId: string): Promise<IBotWhitelistDoc> {
    return BotWhitelist.findOne({ guildId, userId }).exec()
}

export async function isBotWhitelisted(guildId: string, userId: string): Promise<boolean> {
    return (await getBotWhitelist(guildId, userId)) != null
}

export async function addWhitelist(guildId: string, userId: string) {

    return BotWhitelist.create({ guildId, userId })
}

export function removeWhitelist(guildId: string, userId: string) {
    return BotWhitelist.deleteOne({ guildId, userId })
}
