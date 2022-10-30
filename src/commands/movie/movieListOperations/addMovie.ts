/**
 * Add a link to a movie for downloading.
 * 
 * This will store the:
 * 		name of the movie
 * 		download link
 * 		the zip password
 * 		the id of the uploader
 * 
 * @file   Creates link in mongo
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
        .setName('addmovie')
        .setDescription('Adds a movie given to the list given the access link and the name')
        .addStringOption(option => option.setName('name').setDescription('Movie name').setRequired(true))
        .addStringOption(option => option.setName('link').setDescription('Magnet link to download').setRequired(true))
        .addStringOption(option => option.setName('password').setDescription('Zip password if applicable').addChoices([['default', 'default']]).setRequired(false)),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { guildId, userId, guild } = assertGuildTextCommand(interaction)

            const movieName = getFilteredInput(interaction, 'name', FilterInputTypes.STRING, InteractionFilters.regexFilter(somethingRegex), 'Not a valid movie name')
            const movieLink = getFilteredInput(interaction, 'link', FilterInputTypes.STRING, InteractionFilters.regexFilter(linkRegex), 'Not a valid movie link')
            let moviePassword = interaction.options.getString('password') || ''
            if (moviePassword == 'default') {
                moviePassword = await Movie.getMovieDefaultPassword(guildId)
            }

            const resp = await Movie.addMovie(
                guildId,
                userId,
                movieLink,
                movieName,
                moviePassword,
                false,
                undefined,
                guild
            )

            if (resp.updated) {
                interEditReplyUtil(interaction, { content: `${movieName} has been added to the list` })
            }

        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }

        }

    }
}


export default command
