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
import { Message,TextBasedChannels} from 'discord.js'
import { getTimeStrFromSeconds, delay } from '../util/timeUtil'
import { NumberConstants } from '../util/constants'
import { sendToChannel, deleteMessage } from '../util/messageUtil'
import { client } from '../bot'
import { IMovieStatusUpdateDoc, MovieStatus } from '../db/models/guildModel'

const rule = '* * * * *'
const jobFunction = async function () {
    const downloadingArr = await Movie.getStatusUpdaters()

    downloadingArr.forEach((x) => {
        x.arr.forEach((el) => {
            if (!el.started) {
                Movie.updateStatusUpdating(x.guildID, el)

                let textChannel = client.channels.resolve(el.textChannelID) as TextBasedChannels
                updateStatus(x.guildID, textChannel, el._id)
            }
        })
    })
}

async function updateStatus(guildID: string, textChannel: TextBasedChannels, movieID: Schema.Types.ObjectId) {
    const stcResponse = await sendToChannel(
        textChannel,
        'Movie Download in progress. Will update download status here...',
        false
    )

    const statusMessage = stcResponse.messages[0]
    while (true) {
        if (statusMessage) {
            const res = await Movie.lookupStatusUpdateByID(guildID, movieID)
            const stat = res.statusUpdate
            const doc = res.doc
            if (!stat || !doc) {
                if (stat) {
                    endStatusUpdate(guildID, stat, statusMessage)
                }
                return
            }

            let updateString: string = ''
            if (stat.status == MovieStatus.DOWNLOADING) {
                updateString = `Downloading ${doc.movieName}: ${doc.percent}%\nTime Elapsed: ${getTimeStrFromSeconds(
                    doc.time
                )}`
            } else if (stat.status == MovieStatus.UPLOADING) {
                updateString = `Uploading ${doc.movieName}: ${doc.percent}%\nTime Elapsed: ${getTimeStrFromSeconds(
                    doc.time
                )}`
            } else if (stat.status == MovieStatus.UPLOADED) {
                updateString = `${doc.movieName} has been uploaded'`
                deleteMessage(statusMessage, 30 * NumberConstants.secs)
                endStatusUpdate(guildID, stat, statusMessage)
                return
            } else if (stat.status == MovieStatus.ERROR) {
                sendToChannel(textChannel, `Error downloading. Quitting...`)
                endStatusUpdate(guildID, stat, statusMessage)
                return
            }

            if (updateString != '') statusMessage.edit(updateString)

            await delay(5000)
        }
    }
}

function endStatusUpdate(guildID: string, stat: IMovieStatusUpdateDoc, statusMessage: Message) {
    Movie.deleteStatusUpdateObj(guildID, stat)
    deleteMessage(statusMessage, 0)
}

const job: BatchJob = {
    rule: rule,
    function: jobFunction,
}

export default job
