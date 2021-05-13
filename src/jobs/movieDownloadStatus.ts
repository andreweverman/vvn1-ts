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

const rule = '* * * * *'
const jobFunction = async function () {
    const downloadingArr = await Movie.getDownloadingMovies()

    downloadingArr.forEach((x) => {
        if (x.downloads.textChannelID && !x.downloads.statusUpdating) {
            Movie.updateStatusUpdating(x.guildID,x.downloads)
            let textChannel = client.channels.resolve(x.downloads.textChannelID) as MessageChannel
            updateStatus(x.guildID, textChannel, x.downloads._id)
        }
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
            let downloadRequest = await Movie.lookupMovieDownloadByID(guildID, movieID)
            if (!downloadRequest) return

            let updateString: string = ''
            if (downloadRequest.downloading) {
                updateString = `Downloading ${downloadRequest.movieName}: ${
                    downloadRequest.downloadPercent
                }%\nTime Elapsed: ${getTimeStrFromSeconds(downloadRequest.secondsDownloading)}`
            } else if (downloadRequest.uploading) {
                updateString = `Uploading ${downloadRequest.movieName}: ${
                    downloadRequest.uploadPercent
                }%\nTime Elapsed: ${getTimeStrFromSeconds(downloadRequest.secondsUploading)}`
            } else if (downloadRequest.uploaded) {
                updateString = `${downloadRequest.movieName} has been uploaded'`
                deleteMessage(statusMessage, 30 * NumberConstants.secs)
                return
            } else if (downloadRequest.error) {
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
