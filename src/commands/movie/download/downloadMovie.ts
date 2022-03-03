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



import { CommandInteraction, MessageActionRow, MessageButton, Message, MessageEmbed, MessageSelectMenu, MessageSelectOptionData } from 'discord.js'
import { Prompt, Filter } from '../../../util/messageUtil'
import { SlashCommandBuilder } from '@discordjs/builders'
import { NumberConstants } from '../../../util/constants'
import { Guild, Movie } from '../../../db/controllers/guildController'
import { magnetRegex } from '../../../util/stringUtil'
import { GeneralFilter } from '../../../util/promptUtil'
import { interReplyUtil } from '../../../util/interactionUtil'
const command = {
    data: new SlashCommandBuilder()
        .setName('downloadmovie')
        .setDescription('Downloads a movie given a magnet link')
        .addStringOption(option => option.setName('name').setDescription('Movie name').setRequired(true))
        .addStringOption(option => option.setName('link').setDescription('Magnet link to download').setRequired(true)),
    async execute(interaction: CommandInteraction) {
        try {

            const userId = interaction.user.id
            const textChannel = interaction.channel
            const guildId = interaction.guildId

            if (!(guildId && textChannel)) {
                interaction.reply(`Must use this command from a server's text channel to use this command`)
                return
            }

            const guildDoc = await Guild.getGuild(guildId)

            if (guildDoc.config.premium) {

                const movieName = interaction.options.getString('name')!
                const torrentLink = interaction.options.getString('link')!

                if (movieName.trim() === '') {
                    interaction.reply({ content: 'Invalid movie name', ephemeral: true })
                    return
                }

                if (!GeneralFilter.regexFilter(torrentLink, magnetRegex, true)) {
                    interaction.reply({ content: 'Invalid magnet link', ephemeral: true })
                    return
                }

                const zipPassword = await Movie.getMovieDefaultPassword(guildId)

                const res = await Movie.createMovieDownloadRequest(
                    guildId,
                    userId,
                    movieName,
                    torrentLink,
                    '',
                    zipPassword,
                    textChannel
                )
                if (!res.updated) return
                interReplyUtil(interaction, { content: `Request to download ${movieName} has been created. Progress will be shown soon...` })

            } else {
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }

    }
}





export default command
