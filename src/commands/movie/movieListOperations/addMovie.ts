import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter } from '../../../util/message.util'
import { Link, Movie } from '../../../db/controllers/guild.controller'
import { ILink } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { AliasUtil, MovieUtil } from '../../../util/general.util'

const command: commandProperties = {
    name: 'addmovie',
    aliases: ['add_movie', 'createmovie'],
    description: 'Add a movie to the catalog. Need a link and the name',
    usage: '[movie_url] [movie name]. Ex: ?addmovie fight_club_link.com fight club. ',
    args: false,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        const args = {
            userID: userID,
            guildID: guildID,
            textChannel: textChannel,
        }

        try {
            const movieLink = await MovieUtil.Prompt.promptMovieLink(args)
            const movieName = await MovieUtil.Prompt.promptMovieName(args)
            const moviePassword = await MovieUtil.Prompt.promptMoviePassword(args)

            return await Movie.addMovie(
                guildID,
                userID,
                movieLink,
                movieName,
                moviePassword,
                e.message.guild!,
                textChannel
            )
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command