/**
 * Adds a request for a movie to be uploaded for viewing
 * 
 * Requests from this will be deleted when they are added in the movie list way
 * 
 * @file   Adds request for movie
 * @author Andrew Everman.
 * @since  18.2.2021
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { MovieUtil } from '../../../util/generalUtil'

const command: commandProperties = {
    name: 'addmovierequest',
    description: 'Adds a request for a movie to be added to the list',
    aliases: ['addrequest', 'request', 'requestmovie'],
    guildOnly: true,
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const args = {
                userID: userID,
                guildID: guildID,
                textChannel: textChannel,
            }

            const movieName = await MovieUtil.Prompt.promptMovieName(args)
            Movie.addRequest(guildID,userID,movieName,textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command