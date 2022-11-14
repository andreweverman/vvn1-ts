import Guilds, { IGuild, IGuildDoc } from '../models/guildModel'

export async function findOrCreateGuild(guildId: string, premium = false) {
    const found = await getGuild(guildId)
    if (found) {
        return found
    }
    const guild = (await Guilds.create({ guildId, premium })) as IGuildDoc
    return guild
}

export function getGuild(guildId: string): Promise<IGuildDoc> {
    return Guilds.findOne({ guildId }).exec()
}

export async function setPremium(guildId: string, premium: boolean) {
    return Guilds.updateOne({ guildId }, { premium })
}
