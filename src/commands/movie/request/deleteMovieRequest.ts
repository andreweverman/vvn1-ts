/**
 * Deletes a movie request
 * 
 * Delete any of the requests made by the user for the specific guild
 *
 * @file   Deletes movie request
 * @author Andrew Everman.
 * @since  18.2.2021
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'

const command: commandProperties = {
    name: 'deletemovierequest',
    description: 'Deletes a movie request',
    aliases: ['deleterequest', 'rmrequest'],
    guildOnly: true,
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const { requestedMovies, message } = await Movie.getUserRequestedMovies(guildID, userID)

            const m = await Prompt.arraySelect(userID, textChannel, requestedMovies, message, {
                multiple: false,
            })

            if (m.arrayElement) {
                Movie.deleteRequestedMovie(guildID, userID, m.arrayElement, textChannel)
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
