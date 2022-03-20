/**
 * View the the movies in mongo
 *
 * @file   View the the movies in mongo
 * @author Andrew Everman.
 * @since  17.7.2020
 */



import { CommandInteraction, MessageActionRow, MessageButton, Message, MessageEmbed, MessageSelectMenu, MessageSelectOptionData } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { Movie } from '../../../db/controllers/guildController'
import { linkRegex, somethingRegex } from '../../../util/stringUtil'
import { interEditReplyUtil, assertGuildTextCommand, replyWithFlayedArray, getFilteredInput, InteractionFilters, FilterInputTypes } from '../../../util/interactionUtil'
import { MovieUtil } from '../../../util/generalUtil'
import { NumberConstants } from '../../../util/constants'

const command = {
    data: new SlashCommandBuilder()
        .setName('movies')
        .setDescription('View movies (not including the server ones)'),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { guildId } = assertGuildTextCommand(interaction)

            const { movies } = await Movie.getMovies(guildId, [], true)

            const selectedMovie = await replyWithFlayedArray(interaction, 'Select movie for more information', movies, (movie) => movie.name, { deleteWhenDone: false })


            if (selectedMovie) {
                interEditReplyUtil(interaction, { content: `Loading movie info for *${selectedMovie.name}*...` }, { delete: false })
                const { embeds } = await MovieUtil.getMovieInfo(selectedMovie)
                if (embeds) {
                    interEditReplyUtil(interaction, { embeds, components: [] }, { timeout: 5 * NumberConstants.mins })
                } else {
                    interEditReplyUtil(interaction, { content: 'Movie information not found' }, { delete: true })

                }
            }

        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }

        }

    }
}





// import { CommandParams, commandProperties } from '../../../bot'
// import { sendPaginationOptions, sendToChannel, Prompt, Filter } from '../../../util/messageUtil'
// import { NumberConstants } from '../../../util/constants'
// import { IMovieDoc } from '../../../db/models/guildModel'
// import { MovieUtil } from '../../../util/generalUtil'

// const commands: commandProperties = {
//     name: 'movies',
//     aliases: ['catalog', 'movies'],
//     usage: '[movie_name](optional) Ex: for all, do ?catalog. For fight club, do ?catalog fight club',
//     description: 'Shows all of the movies that are in the database and the links to download them',
//     cooldown: 0,
//     args: false,
//     guildOnly: true,
//     async execute(e: CommandParams) {
//         const userID = e.message.author.id
//         const guildID = e.message.guild!.id
//         const textChannel = e.message.channel
//         const back = 'back'
//         try {
//             while (true) {
//                 const { movies, message } = await Movie.getMovies(guildID, e.args, false)

//                 let options: undefined | sendPaginationOptions
//                 if (Array.isArray(message)) {
//                     options = { userID: e.message.author.id, embeds: message }
//                 }

//                 const arrSel = await Prompt.arraySelect(
//                     userID,
//                     textChannel,
//                     movies,
//                     (movie: IMovieDoc) => `[${movie.name}](${movie.link} 'Download Link')`,
//                     'Movie Catalog. Select a movie to get information',
//                     { time: 10 * NumberConstants.mins }
//                 )

//                 if (arrSel.arrayElement) {
//                     const loadingMessage = await sendToChannel(textChannel, 'Loading movie info...', false)
//                     const { message } = await MovieUtil.getMovieInfo(arrSel.arrayElement)
//                     loadingMessage.messages[0].delete()
//                     if (message) {
//                         try {
//                             let instrEmbed = new MessageEmbed().addField(
//                                 'Instructions',
//                                 `Message ${back} to go back to the catalog`
//                             )
//                             message.embeds!.push(instrEmbed)
//                             const z = await Prompt.getSameUserInput(
//                                 userID,
//                                 textChannel,
//                                 message,
//                                 Filter.stringFilter(back, { loose: true }),
//                                 { time: 5 * NumberConstants.mins }
//                             )
//                             if (!z) {
//                                 return
//                             }
//                         } catch (e) {
//                             return
//                         }
//                     }
//                 }
//             }
//         } catch (error) {
//             throw error
//         }
//     },
// }

export default command
