/**
 * View the current movie requests
 * 
 * Views all requested movies for the guild
 *
 * @file   View current movie requests
 * @author Andrew Everman.
 * @since  18.2.2021
 * 
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, sendToChannel } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { NumberConstants } from '../../../util/constants'
const command: commandProperties = {
    name: 'viewmovierequests',
    description: 'View the existing movie reuqests',
    aliases: ['viewrequests', 'requests'],
    guildOnly: true,
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const textChannel = e.message.channel

            const { requestedMovies, message } = await Movie.getRequestedMovies(guildID)

            return sendToChannel(
                textChannel,
                message,
                true,
                requestedMovies.length > 0 ? 10 * NumberConstants.mins : 15 * NumberConstants.secs
            )
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
