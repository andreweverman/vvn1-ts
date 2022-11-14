import { Message } from 'discord.js'
import { client } from '../../bot'
import { sendToChannel } from '../../util/messageUtil'
import { StatusUpdateMessage } from '../../util/queue'
import StatusUpdate, { IStatusUpdate, IStatusUpdateDoc } from '../models/statusUpdateModel'

export async function findOrCreateStatusMessage(
    status: StatusUpdateMessage,
    createMessage: string
): Promise<Message | null> {
    let textChannel = client.channels.resolve(status.textChannelId)
    if (textChannel?.isTextBased()) {
        let statusUpdateDoc = await StatusUpdate.findOne({ id: status.id }).exec()
        if (statusUpdateDoc) {
            const message = await textChannel.messages.fetch(statusUpdateDoc.messageId)
            if (message) {
                return message
            }
        }

        // didnt find, deleting any with id so wwe dont have a problem
        await StatusUpdate.deleteMany({ id: status.id })
        const message = (await sendToChannel(textChannel, createMessage, false)).messages[0]

        let statusUpdate: IStatusUpdate = {
            guildId: status.guildId,
            messageId: message.id,
            textChannelId: status.textChannelId,
            id: status.id,
        }
        StatusUpdate.create(statusUpdate)
        return message
    }
    return null
}
