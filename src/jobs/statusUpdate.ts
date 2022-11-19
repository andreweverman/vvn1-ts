import { NumberConstants } from '../util/constants'
import { Message } from 'discord.js'
import { sendToChannel, deleteMessage } from '../util/messageUtil'
import { StatusUpdateMessage } from '../util/queue'
import { findOrCreateStatusMessage } from '../db/controllers/statusUpdateController'
import { getTimeStrFromSeconds } from '../util/timeUtil'
export async function updateStatus(status: StatusUpdateMessage) {
    const message: Message | null = await findOrCreateStatusMessage(
        status,
        'Movie Download in progress. Will update download status here...'
    )

    if (!message) return

    let updateString: string = ''
    if (status.percentDone != 100) {
        const remainingStr = status.timeRemaining? `- ${getTimeStrFromSeconds(status.timeRemaining)} remaining` : `Calculating Time Remaining`
        updateString = `***${status.movieName}***\n${
            status.percentDone
        }% ${remainingStr}`
    } else {
        updateString = `${status.movieName} has been uploaded'`
        message.edit(updateString)
        deleteMessage(message, 30 * NumberConstants.secs)
        return
    }

    if (updateString != '') message.edit(updateString)
}
