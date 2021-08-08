/**
 * Gets the movies from offline storage
 *
 * @file   Command for getting the offline stored movies
 * @author Andrew Everman.
 * @since  27.6.2021
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, sendToChannel } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { MovieUtil } from '../../../util/generalUtil'
import { NumberConstants } from '../../../util/constants'

const command: commandProperties = {
    name: 'upload_offline',
    aliases: [],
    description: 'Add a movie to the catalog. Need a link and the name',
    usage: '[movie_url] [movie name]. Ex: ?addmovie fight_club_link.com fight club. ',
    args: false,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        const selection = await Movie.getMovieList(guildID, textChannel, userID)
        if (selection.arrayElements) {
            selection.arrayElements.forEach((movie) => {
                Movie.createMovieUploadRequest(guildID, userID, movie, textChannel.id)
            })
        } else if (selection.arrayElement) {
            Movie.createMovieUploadRequest(guildID, userID, selection.arrayElement, textChannel.id)
        }
    },
}

export default command
