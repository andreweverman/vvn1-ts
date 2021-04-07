/**
 * Adds a watch list entry for a user
 *
 * The watch list is a way for a user to mark interest in an uploaded movie
 * Marked in mongo under the movie that is uploaded
 *
 * @file   Add watch list entry
 * @author Andrew Everman.
 * @since  18.2.2021
 *
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { MovieUtil } from '../../../util/generalUtil'

const command: commandProperties = {
    name: 'addtowatchlist',
    aliases: ['addtolist', 'want', 'addwatchlist'],
    description: 'Mark what movies you are interested in watching',
    usage: 'Select what movies you want to watch',
    cooldown: 0,
    args: false,
    guildOnly: true,
    async execute(e: CommandParams) {
        const userID = e.message.author.id
        const guildID = e.message.guild!.id
        const textChannel = e.message.channel

        const movies = await MovieUtil.selectMovie(guildID, userID, textChannel, true, false)

        if (movies?.arrayElements) {
            Movie.addToWatchList(guildID, userID, movies.arrayElements, textChannel)
        } else {
            throw new Error('wrong response type from selectMovie')
        }

        try {
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
