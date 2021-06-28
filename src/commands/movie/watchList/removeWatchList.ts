/**
 * Removes a movie from user's watch list
 *
 * Only deletes for the user
 *
 * @file   Deletes watchlisted movie entry
 * @author andrew everman.
 * @since  18.2.2021
 *
 */

import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, sendToChannel } from '../../../util/messageUtil'
import { Movie } from '../../../db/controllers/guildController'
import { IMovieDoc } from '../../../db/models/guildModel'
const command: commandProperties = {
    name: 'removewatchlist',
    aliases: ['deletewatchlist'],
    description: 'Mark what movies you are interested in watching',
    usage: 'Select what movies you want to watch',
    cooldown: 0,
    args: false,
    guildOnly: true,
    async execute(e: CommandParams) {
        try {
            const userID = e.message.author.id
            const guildID = e.message.guild!.id
            const textChannel = e.message.channel

            const { watchListArray, message, stringMessage } = await Movie.getWatchListForMember(
                guildID,
                userID,
                e.message.guild!,
                true
            )

            if (stringMessage) {
                sendToChannel(textChannel, stringMessage)
                return
            }
            if (!message) {
                throw new Error('getWatchListForMember did not return correctly')
            }

            const { arrayElement, arrayElements } = await Prompt.arraySelect(
                userID,
                textChannel,
                watchListArray,
                (x: IMovieDoc) => `${x.name}`,
                'Select a watch list item to delete',
                { multiple: true }
            )

            if (!arrayElement && !arrayElements) {
                throw new Error('No array selection')
            }
            let deleteElements = arrayElement ? [arrayElement] : (arrayElements as IMovieDoc[])

            Movie.deleteFromWatchList(guildID, userID, deleteElements, textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
