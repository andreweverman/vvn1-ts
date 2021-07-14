/**
 *
 *  Job for when movies are done being uploaded
 *
 *  If a movie is uploaded, move the movie to the uploaded queue and
 *  add it to the movie list
 *
 * @file   Movie uploaded job
 * @author Andrew Everman.
 * @since  13.5.2021
 */

import { BatchJob } from './runner'
import { Movie } from '../db/controllers/guildController'
import { Schema } from 'mongoose'
import { Message } from 'discord.js'
import { getTimeStrFromSeconds, delay } from '../util/timeUtil'
import { NumberConstants } from '../util/constants'
import { sendToChannel, deleteMessage, MessageChannel } from '../util/messageUtil'
import { client } from '../bot'
import { MovieStatus } from '../db/models/guildModel'

const rule = '* * * * *'
const jobFunction = async function () {
    const downloadingArr = await Movie.getStatusUpdaters()

    downloadingArr.forEach((x) => {
        x.arr.forEach((el) => {
            if (!el.started) {
                Movie.updateStatusUpdating(x.guildID, el)

                let textChannel = client.channels.resolve(el.textChannelID) as MessageChannel
                updateStatus(x.guildID, textChannel, el._id)
            }
        })
    })
}

async function updateStatus(guildID: string, textChannel: MessageChannel, movieID: Schema.Types.ObjectId) {
    const stcResponse = await sendToChannel(
        textChannel,
        'Movie Download in progress. Will update download status here...',
        false
    )

    const statusMessage = stcResponse.messages[0]
    while (true) {
        if (statusMessage) {
            let statusUpdate = await Movie.lookupStatusUpdateByID(guildID, movieID)
            if (!statusUpdate) {
                deleteMessage(statusMessage, 0)
                return
            }

            let updateString: string = ''
            if (statusUpdate.status == MovieStatus.DOWNLOADING) {
                updateString = `Downloading ${statusUpdate.movieName}: ${
                    statusUpdate.percent
                }%\nTime Elapsed: ${getTimeStrFromSeconds(statusUpdate.seconds)}`
            } else if (statusUpdate.status == MovieStatus.UPLOADING) {
                updateString = `Uploading ${statusUpdate.movieName}: ${
                    statusUpdate.percent
                }%\nTime Elapsed: ${getTimeStrFromSeconds(statusUpdate.seconds)}`
            } else if (statusUpdate.status == MovieStatus.UPLOADED) {
                updateString = `${statusUpdate.movieName} has been uploaded'`
                deleteMessage(statusMessage, 30 * NumberConstants.secs)
                return
            } else if (statusUpdate.status == MovieStatus.ERROR) {
                sendToChannel(textChannel, `Error downloading. Quitting...`)
                return
            }

            if (updateString != '') statusMessage.edit(updateString)

            await delay(5000)
        }
    }
}

const job: BatchJob = {
    rule: rule,
    function: jobFunction,
}

export default job
