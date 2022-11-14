import mongoose, { Schema, Document, ObjectId } from 'mongoose'


export interface IBotWhitelist {
    guildId: string
    userId: string
}

export interface IBotWhitelistDoc extends IBotWhitelist, Document {}

const BotWhitelistSchema = new Schema({
    guildId: { type: String,  index: true, required: true },
    userId: { type: String, index:true,required: true },
})

export default mongoose.models.BotWhitelist || mongoose.model<IBotWhitelistDoc>('BotWhitelist', BotWhitelistSchema)
