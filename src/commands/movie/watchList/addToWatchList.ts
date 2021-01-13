import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Movie } from '../../../db/controllers/guild.controller'
import { ILink } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { AliasUtil, MovieUtil } from '../../../util/general.util'
import { NumberConstants } from '../../../util/constants'

const command: commandProperties = {
    name: 'addtowatchlist',
    aliases: ['addtolist','want','addwatchlist'],
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
