/**
 * Gets the movies from offline storage
 *
 * @file   Command for getting the offline stored movies
 * @author Andrew Everman.
 * @since  27.6.2021
 */


import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { NumberConstants } from '../../../util/constants'
import { Guild, Movie } from '../../../db/controllers/guildController'
import { assertGuildTextCommand, replyWithFlayedArray } from '../../../util/interactionUtil'
const command = {
    data: new SlashCommandBuilder()
        .setName('uploadfromlist')
        .setDescription('Creates mega link from movie on the server.'),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { guildId, textChannel, userId } = assertGuildTextCommand(interaction)

            const guildDoc = await Guild.getGuild(guildId)
            if (guildDoc.config.premium) {
                const movies = await Movie.getMovieList(guildId)
                const movie = await replyWithFlayedArray(interaction, 'All Movies. Select one to upload to mega', movies, (movie) => movie.name, { deleteAfter: NumberConstants.mins * 15, })
                if (movie) {
                    Movie.createMovieUploadRequest(guildId, userId, movie, textChannel.id)
                }
            }

        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }
        }

    }
}


export default command
