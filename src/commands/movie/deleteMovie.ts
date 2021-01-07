import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/message.util'
import { Link, Movie } from '../../db/controllers/guild.controller'
import { ILink } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { AliasUtil, MovieUtil } from '../../util/general.util'
import { IMovieDoc } from '../../db/models/guild.model'
const command: commandProperties = {
    name: 'deletemovie',
    aliases: ['delete_movie', 'removemovie'],
    description: 'Delete a movie from the catalog. Type in its name',
    usage: ', then follow the prompts',
    args: false,
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        try {
            const movie = await MovieUtil.selectMovie(guildID, userID, textChannel, true)

            let movieToDelete: IMovieDoc | IMovieDoc[] | undefined
            if (movie?.arrayElement) movieToDelete = movie.arrayElement
            if (movie?.arrayElements) movieToDelete = movie.arrayElements
            if (!movieToDelete) return undefined
            return await Movie.deleteMovie(guildID, movieToDelete, textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
