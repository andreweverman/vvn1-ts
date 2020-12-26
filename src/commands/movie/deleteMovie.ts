import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/message.util'
import { Link, Movie } from '../../db/controllers/guild.controller'
import { ILink } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { AliasUtil, MovieUtil } from '../../util/general.util'

const command: commandProperties = {
    name: 'deletemovie',
    aliases: ['delete_movie', 'removemovie'],
    description: 'Delete a movie from the catalog. Type in its name',
    usage: 'Follow the prompts!',
    args: false,
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        try {
            const { movies, message } = await Movie.getMovies(guildID, e.args, true)
            const movie = await Prompt.arraySelect(userID, textChannel, movies, message, {
                multiple: true,
                customOffset: 1,
            })

            return await Movie.deleteMovie(guildID, movie, textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
