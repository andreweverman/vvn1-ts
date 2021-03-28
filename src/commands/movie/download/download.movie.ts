import { CommandParams, commandProperties } from '../../../bot'
import * as lodash from 'lodash'
import { TextChannel, Message, MessageEmbed } from 'discord.js'
import { Movie, Guild } from '../../../db/controllers/guild.controller'
import { Prompt, Filter, sendToChannel, sendUtilResponse, deleteMessage } from '../../../util/message.util'
import { extractActiveUsers, extractChannels } from '../../../util/discord.util'
import { NumberConstants } from '../../../util/constants'
import { magnetRegex, validFileRegex } from '../../../util/string.util'
import { IMovieDownloadElementDoc } from '../../../db/models/guild.model'
import { MovieUtil } from '../../../util/general.util'
import { Schema } from 'mongoose'

const command: commandProperties = {
    name: 'downloadmovie',
    args: false,
    description: 'Allows you to have vvn1 download a specified torrent for you and upload it to mega',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        try {
            const userID = e.message.author.id
            const textChannel = e.message.channel
            const guildID = e.message.guild!.id

            const guildDoc = await Guild.getGuild(guildID)

            if (guildDoc.premium) {
                const movieNameMessage = await Prompt.getSameUserInput(
                    userID,
                    textChannel,
                    'Enter the movie name you intend to download:',
                    Filter.anyFilter()
                )

                const torrentLinkMessage = await Prompt.getSameUserInput(
                    userID,
                    textChannel,
                    'Enter the torrent link:',
                    Filter.regexFilter(magnetRegex, true)
                )

                const zipNameMessage = await Prompt.getSameUserInput(
                    userID,
                    textChannel,
                    'Enter the name of the zip file to be created:',
                    Filter.regexFilter(validFileRegex, true)
                )

                const zipPassword = await MovieUtil.Prompt.promptMoviePassword({
                    guildID: guildID,
                    userID: userID,
                    textChannel: textChannel,
                })
                const movieName = movieNameMessage.content.trim()
                const torrentLink = torrentLinkMessage.content.trim()
                const zipName = zipNameMessage.content.trim()
                // const zipPassword = zipPasswordMessage.content.trim()

                const res = await Movie.createMovieDownloadRequest(
                    guildID,
                    userID,
                    movieName,
                    torrentLink,
                    zipName,
                    zipPassword,
                    textChannel
                )
                if (!res.updated) return

                let firstRequestedMovie = await Movie.getFirstDownloadRequest(guildID)
                if (firstRequestedMovie === null) return
                if (firstRequestedMovie?.movieName == movieName) {
                    // this means we will update send a messages about the status of the download

                    const stcResponse = await sendToChannel(
                        textChannel,
                        'First in download queue. Will update download status here...',
                        false
                    )

                    const statusMessage = stcResponse.messages[0]
                    updateStatus(statusMessage, firstRequestedMovie._id)
                }

                async function updateStatus(statusMessage: Message, movieID: Schema.Types.ObjectId) {
                    if (statusMessage) {
                        let downloadRequest = await Movie.lookupMovieDownloadByID(guildID, movieID)
                        if (!downloadRequest) return

                        let updateString: string = ""
                        if (downloadRequest.downloading) {
                            updateString = `Downloading ${downloadRequest.movieName}: ${downloadRequest.downloadPercent}%\nTime Elapsed: ${downloadRequest.secondsDownloading}`
                        } else if (downloadRequest.uploading) {
                            updateString = `Uploading ${downloadRequest.movieName}: ${downloadRequest.uploadPercent}%\nTime Elapsed: ${downloadRequest.secondsUploading}`
                        } else if (downloadRequest.uploaded) {
                            updateString = 'Movie has been uploaded'
                            deleteMessage(statusMessage, 30*NumberConstants.secs)
                        } else if (downloadRequest.error) {
                            sendToChannel(textChannel, `Error downloading. Quitting...`)
                            return 
                        }
                        
                        statusMessage.edit(updateString)
                        setTimeout(() => {
                            updateStatus(statusMessage, movieID)
                        }, 5000)
                    }
                }

                // more logic for getting the file when done and stuff like that
                // want to keep as much db stuff in TS as I can to make sure that it works the best
            } else {
                sendToChannel(textChannel, 'This server does not have vvn1 premium. Message gardenweasel#1114')
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
