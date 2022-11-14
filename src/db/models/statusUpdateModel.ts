import mongoose, { Schema, Document, ObjectId } from 'mongoose'

export interface IStatusUpdate {
    guildId: string
    textChannelId:string
    messageId:string,
    id:string

}

export interface IStatusUpdateDoc extends IStatusUpdate, Document {
    id:string
}

const StatusUpdateSchema = new Schema({
    guildId: { type: String, unique: false, index: true, required: true },
    textChannelId: { type: String, unique: false, index: true, required: true },
    messageId: { type: String, unique: false, index: false, required: true },
    id: { type: String, unique: true, index: true, required: true },
})

export default mongoose.models.StatusUpdate || mongoose.model<IStatusUpdateDoc>('StatusUpdate', StatusUpdateSchema)
