/**
 * Removes a movie download request
 *
 * User gets promted for a request to delete
 * Then we delete it
 *
 * @file   Deletes download request
 * @author Andrew Everman.
 * @since  17.1.2021
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Movie, Guild } from '../../../db/controllers/guildController'
import { Prompt, sendToChannel } from '../../../util/messageUtil'

const command: commandProperties = {
    name: 'deletedownloadrequest',
    args: false,
    description: 'Delete a torrent request',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        try {
            const userID = e.message.author.id
            const textChannel = e.message.channel
            const guildID = e.message.guild!.id

            const guildDoc = await Guild.getGuild(guildID)

            if (guildDoc.config.premium) {
                const offset = 1
                const movies = await Movie.getUploadedMovies(guildID)
                const response = await Prompt.arraySelect(
                    userID,
                    textChannel,
                    movies,
                    (x, i) => `${i + offset}. ${x.movieName}`,
                    'Select a request to delete',
                    {
                        customOffset: offset,
                        multiple: true,
                    }
                )

                if (response.arrayElements) {
                    response.arrayElements.forEach((movie) => {
                        // Movie.deleteMovie(guildID,movie)
                    })
                } else {
                    sendToChannel(textChannel, 'Error on my end')
                }
            } else {
                sendToChannel(textChannel, 'This server does not have vvn1 premium. Message gardenweasel#1512')
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
