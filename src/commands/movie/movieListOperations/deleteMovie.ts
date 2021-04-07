/**
 * Deletes a movie object in mongo
 *
 * @file   Deletes a movie object in mongo
 * @author Andrew Everman.
 * @since  17.7.2020
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { MovieUtil } from '../../../util/generalUtil'
import { IMovieDoc } from '../../../db/models/guildModel'
const command: commandProperties = {
    name: 'deletemovie',
    aliases: ['delete_movie', 'removemovie'],
    description: 'Delete a movie from the catalog. Type in its name',
    usage: ', then follow the prompts',
    args: false,
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        try {
            const movie = await MovieUtil.selectMovie(guildID, userID, textChannel, true)

            let movieToDelete: IMovieDoc | IMovieDoc[] | undefined
            if (movie?.arrayElement) movieToDelete = movie.arrayElement
            if (movie?.arrayElements) movieToDelete = movie.arrayElements
            if (!movieToDelete) return undefined
            return await Movie.deleteMovie(guildID, movieToDelete, textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
