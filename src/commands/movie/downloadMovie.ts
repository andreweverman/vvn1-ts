/**
 * Creates a download ticket for the moviedownload.py server to download
 *
 * User gives the name, magnet link, zip name, and zip password.
 * This command then puts that info in mongo for the python server to download
 * This code can be found at https://github.com/andreweverman/moviedownload
 *
 * @file   Creates download ticket
 * @author Andrew Everman.
 * @since  17.1.2021
 */

import {
    ChatInputApplicationCommandData,
    ChatInputCommandInteraction,
    CommandInteraction,
    Interaction,
} from 'discord.js'
import { Prompt } from '../../util/messageUtil'
import { SlashCommandBuilder } from '@discordjs/builders'
import { magnetRegex } from '../../util/stringUtil'
import { GeneralFilter } from '../../util/promptUtil'
import { interEditReplyUtil, interReplyUtil } from '../../util/interactionUtil'
import { findOrCreateGuild } from '../../db/controllers/guildController'
import { publishToQueue, Queues } from '../../util/queue'
const command = {
    data: new SlashCommandBuilder()
        .setName('downloadmovie')
        .setDescription('Downloads a movie given a magnet link')
        .addStringOption((option) => option.setName('name').setDescription('Movie name').setRequired(true))
        .addStringOption((option) =>
            option.setName('link').setDescription('Magnet link to download').setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply()
            const textChannel = interaction.channel
            const guildId = interaction.guildId

            if (!(guildId && textChannel)) {
                interaction.reply(`Must use this command from a server's text channel to use this command`)
                return
            }

            const guildDoc = await findOrCreateGuild(guildId)

            if (!guildDoc.premium) {
                interEditReplyUtil(interaction, { content: 'Must be premium to use this command.' })
            }

            const movieName = interaction.options.getString('name')!
            const torrentLink = interaction.options.getString('link')!

            if (movieName.trim() === '') {
                interEditReplyUtil(interaction, { content: 'Invalid movie name' })
                return
            }

            if (!GeneralFilter.regexFilter(torrentLink, magnetRegex, true)) {
                interEditReplyUtil(interaction, { content: 'Invalid magnet link' })
                return
            }

            const res = await publishToQueue(Queues.movieAdd, 'mvdl.download', {
                movieName,
                torrentLink,
                guildId,
                textChannelId: interaction.channelId,
            })
            if (res) {
                interEditReplyUtil(interaction, {
                    content: `Request to download ${movieName} has been created. Progress will be shown soon...`,
                })
            } else {
                interEditReplyUtil(interaction, { content: `Error creating request to download ${movieName}` })
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
