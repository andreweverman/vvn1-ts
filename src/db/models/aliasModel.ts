import mongoose, { Schema, Document, ObjectId } from 'mongoose'

export enum SpecialAliases {
    mainVoice = 'mainVoice',
}

export enum AliasType {
    user = 'user',
    voiceChannel = 'voiceChannel',
    textChannel = 'textChannel',
}
export interface IAlias {
    guildId: string
    name: string
    id: string
    type: AliasType
}

export interface IAliasDoc extends IAlias, Document {
    id: string
}

const AliasSchema = new Schema({
    guildId: { type: String, unique: false, index: true, required: true },
    name: { type: String, unique: false, index: true, required: true },
    id: { type: String, required: true },
    type: { type: String, required: true, index: true },
})

export default mongoose.models.Alias || mongoose.model<IAliasDoc>('Alias', AliasSchema)
