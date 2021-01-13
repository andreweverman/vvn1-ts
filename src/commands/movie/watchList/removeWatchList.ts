import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Movie } from '../../../db/controllers/guild.controller'
import { ILink } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { AliasUtil, MovieUtil } from '../../../util/general.util'
import { NumberConstants } from '../../../util/constants'
import { IMovieDoc } from '../../../db/models/guild.model'
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
                message,
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
