/**
 *
 * Mongo model for the guild collection
 *
 * The guild document as well as its subdocuments are defined here
 *
 *
 * @file   Mongo guild collection model
 * @author Andrew Everman.
 * @since  29.10.2020
 */

import mongoose, { Schema, Document } from 'mongoose'

export interface IGuild {
    guildId: string
    premium: boolean
}

export interface IGuildDoc extends IGuild, Document {}

const GuildSchema = new Schema({
    guildId: { type: String, unique: true, index: true },
    premium: { type: Boolean, default: false },
})

export default mongoose.models.Guild || mongoose.model<IGuildDoc>('Guild', GuildSchema)
