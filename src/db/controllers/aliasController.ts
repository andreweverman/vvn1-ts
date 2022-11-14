import Alias, { AliasType, IAliasDoc } from '../models/aliasModel'

export function getAlias(guildId: string, name: string, type: AliasType): Promise<IAliasDoc> {
    return Alias.findOne({ guildId, name, type }).exec()
}

export async function setAlias(guildId: string, name: string, id: string, type: AliasType) {
    await Alias.deleteMany({ guildId, name }).exec()
    return Alias.create({ guildId, name, id, type })
}
