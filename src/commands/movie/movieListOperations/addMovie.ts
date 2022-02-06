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

import { MovieUtil } from '../../../util/generalUtil'




import { CommandInteraction, MessageActionRow, MessageButton, Message, MessageEmbed, MessageSelectMenu, MessageSelectOptionData } from 'discord.js'
import { Prompt, Filter } from '../../../util/messageUtil'
import { SlashCommandBuilder } from '@discordjs/builders'
import { NumberConstants } from '../../../util/constants'
import { Guild, Movie } from '../../../db/controllers/guildController'
import { magnetRegex } from '../../../util/stringUtil'
import { GeneralFilter } from '../../../util/promptUtil'
import { interReplyUtil, assertGuildTextCommand, replyWithFlayedArray } from '../../../util/interactionUtil'
const command = {
    data: new SlashCommandBuilder()
        .setName('addmovie')
        .setDescription('Adds a movie given to the list given the access link and the name')
        .addStringOption(option => option.setName('name').setDescription('Movie name').setRequired(true))
        .addStringOption(option => option.setName('link').setDescription('Magnet link to download').setRequired(true))
        .addStringOption(option => option.setName('password').setDescription('Zip password if applicable').setRequired(false)),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { guildId,userId } = assertGuildTextCommand(interaction)

        
            const movieName = interaction.options.getString('name')!
            const movieLink = interaction.options.getString('link')!
            const moviePassword = interaction.options.getString('password')

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
            return await Movie.addMovie(
                guildID,
                userID,
                movieLink,
                movieName,
                moviePassword,
                false,
                undefined,
                e.message.guild!,
                textChannel
            )
            interReplyUtil(interaction, `Request to download ${movieName} has been created. Progress will be shown soon...`)



        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
            
        }

    }
}




// const commanzd: commandProperties = {
//     name: 'addmovie',
//     aliases: ['add_movie', 'createmovie'],
//     description: 'Add a movie to the catalog. Need a link and the name',
//     usage: '[movie_url] [movie name]. Ex: ?addmovie fight_club_link.com fight club. ',
//     args: false,
//     cooldown: 1,
//     guildOnly: true,

//     async execute(e: CommandParams) {
//         const guildID = e.message.guild!.id
//         const userID = e.message.author.id
//         const textChannel = e.message.channel

//         const args = {
//             userID: userID,
//             guildID: guildID,
//             textChannel: textChannel,
//         }

//         try {
//             const movieLink = await MovieUtil.Prompt.promptMovieLink(args)
//             const movieName = await MovieUtil.Prompt.promptMovieName(args)
//             const moviePassword = await MovieUtil.Prompt.promptMoviePassword(args)

//             return await Movie.addMovie(
//                 guildID,
//                 userID,
//                 movieLink,
//                 movieName,
//                 moviePassword,
//                 false,
//                 undefined,
//                 e.message.guild!,
//                 textChannel
//             )
//         } catch (error) {
//             Prompt.handleGetSameUserInputError(error)
//         }
//     },
// }

export default command
