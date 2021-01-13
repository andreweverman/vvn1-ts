import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Movie } from '../../../db/controllers/guild.controller'
import { ILink } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { AliasUtil, MovieUtil } from '../../../util/general.util'
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

            return sendToChannel(
                textChannel,
                message,
                true,
                movies.length > 0 ? 10 * NumberConstants.mins : 15 * NumberConstants.secs
            )
        } catch (error) {
            throw error
        }
    },
}

export default command
