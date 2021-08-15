/**
 * View the the movies in mongo
 * 
 * @file   View the the movies in mongo
 * @author Andrew Everman.
 * @since  17.7.2020
 */

import { CommandParams, commandProperties } from '../../../bot'
import { sendPaginationOptions, sendToChannel } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { NumberConstants } from '../../../util/constants'

const command: commandProperties = {
    name: 'viewmovie',
    aliases: ['catalog', 'movies'],
    usage: '[movie_name](optional) Ex: for all, do ?catalog. For fight club, do ?catalog fight club',
    description: 'Shows all of the movies that are in the database and the links to download them',
    cooldown: 0,
    args: false,
    guildOnly: true,
    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const textChannel = e.message.channel

        try {
            const { movies, message } = await Movie.getMovies(guildID, e.args, false)
            let options:undefined| sendPaginationOptions
            if(Array.isArray(message)){
                
                options = {userID:e.message.author.id, embeds : message}
            }
            return sendToChannel(
                textChannel,
                message,
                true,
                movies.length > 0 ? 10 * NumberConstants.mins : 15 * NumberConstants.secs,
                options
            )
        } catch (error) {
            throw error
        }
    },
}

export default command
