/**
 * Views the user's watchlisted movies
 *
 * Only views their watchlist for the current guild
 *
 * @file   View watch listed movies
 * @author andrew everman.
 * @since  18.2.2021
 *
 */


import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/messageUtil'
import { Link, Movie } from '../../../db/controllers/guildController'
import { ILink } from '../../../db/models/guildModel'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/stringUtil'
import { AliasUtil, MovieUtil } from '../../../util/generalUtil'
import { NumberConstants } from '../../../util/constants'

const command: commandProperties = {
    name: 'viewwatchlist',
    aliases: ['watchlist'],
    description: 'View what movies are on your watchlist',
    usage: '',
    cooldown: 0,
    args: false,
    guildOnly: true,
    async execute(e: CommandParams) {
        const userID = e.message.author.id
        const guildID = e.message.guild!.id
        const textChannel = e.message.channel

        const { message, stringMessage } = await Movie.getWatchListForMember(guildID, userID, e.message.guild!, false)

        const sendMsg = message ? message : stringMessage
        if (sendMsg) {
            sendToChannel(textChannel, sendMsg, true, 1 * NumberConstants.mins)
        } else {
            throw new Error('Invalid message getting')
        }
    },
}

export default command
