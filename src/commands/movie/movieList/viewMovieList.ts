/**
 * Gets the movies from offline storage
 *
 * @file   Command for getting the offline stored movies
 * @author Andrew Everman.
 * @since  27.6.2021
 */



import { CommandInteraction, MessageActionRow, MessageButton, Message, MessageEmbed, MessageSelectMenu, MessageSelectOptionData } from 'discord.js'
import { Prompt, Filter } from '../../../util/messageUtil'
import { validGuildMember, extractChannels } from '../../../util/discordUtil'
import { SlashCommandBuilder } from '@discordjs/builders'
import { NumberConstants } from '../../../util/constants'
import { Guild, Movie } from '../../../db/controllers/guildController'
import { magnetRegex } from '../../../util/stringUtil'
import { GeneralFilter } from '../../../util/promptUtil'
import { interReplyUtil, assertGuildTextCommand, replyWithFlayedArray } from '../../../util/interactionUtil'
import { IDownloadedMovieDoc } from '../../../db/models/guildModel'
const command = {
    data: new SlashCommandBuilder()
        .setName('allmovies')
        .setDescription('View all movies on the server, including ones that are not uploaded currently'),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { guildId } = assertGuildTextCommand(interaction)

            const guildDoc = await Guild.getGuild(guildId)
            if (guildDoc.config.premium) {
                const movies = await Movie.getMovieList(guildId)
                await replyWithFlayedArray(interaction, 'All Movies', movies, (movie) => movie.name, { deleteAfter: NumberConstants.mins * 15, disableSelection: true })
            }


        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }

    }
}



export default command

