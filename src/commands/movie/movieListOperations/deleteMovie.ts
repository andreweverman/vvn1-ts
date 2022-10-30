/**
 * Deletes a movie object in mongo
 *
 * @file   Deletes a movie object in mongo
 * @author Andrew Everman.
 * @since  17.7.2020
 */


import { CommandInteraction, MessageActionRow, MessageButton, Message, MessageEmbed, MessageSelectMenu, MessageSelectOptionData } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { Movie } from '../../../db/controllers/guildController'
import { linkRegex, somethingRegex } from '../../../util/stringUtil'
import { interEditReplyUtil, assertGuildTextCommand, replyWithFlayedArray, getFilteredInput, InteractionFilters, FilterInputTypes } from '../../../util/interactionUtil'
const command = {
    data: new SlashCommandBuilder()
        .setName('deletemovie')
        .setDescription('Deletes a movie from the list (and mega upload if vvn1 uploaded it)'),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { guildId } = assertGuildTextCommand(interaction)

            const { movies } = await Movie.getMovies(guildId, [], true)

            const movieToDelete = await replyWithFlayedArray(interaction, 'Select movie to delete', movies, (movie) => movie.name, {})


            if (movieToDelete) {
                const resp = await Movie.deleteMovie(guildId, movieToDelete, undefined)
                if (resp.updated)
                    interEditReplyUtil(interaction, { content: `${movieToDelete.name} has been deleted` })
            }

        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }

        }

    }
}





export default command
