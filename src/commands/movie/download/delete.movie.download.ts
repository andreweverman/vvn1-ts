import { CommandParams, commandProperties } from '../../../bot'
import * as lodash from 'lodash'
import { TextChannel, Message, MessageEmbed } from 'discord.js'
import { Movie, Guild } from '../../../db/controllers/guild.controller'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { extractActiveUsers, extractChannels } from '../../../util/discord.util'
import { NumberConstants } from '../../../util/constants'
import { magnetRegex, validFileRegex } from '../../../util/string.util'
import { off } from 'process'

const command: commandProperties = {
    name: 'deletemoviedownload',
    args: false,
    description: 'Delete a megashare movie',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const userID = e.message.author.id
            const textChannel = e.message.channel
            const guildID = e.message.guild!.id

            const guildDoc = await Guild.getGuild(guildID)

            if (guildDoc.premium) {
                const offset = 1
                const movies = await Movie.getUploadedMovies(guildID)
                const msg = movies.map((x, i) => `${i + offset}. ${x.movieName}`).join('\n')
                const response = await Prompt.arraySelect(userID, textChannel, movies, msg, {
                    customOffset: offset,
                    multiple: true,
                })

                if (response.arrayElements) {
                    response.arrayElements.forEach((movie) => {
                        // Movie.deleteMovie(guildID,movie)                        
                    })
                } else {
                    sendToChannel(textChannel, 'Error on my end')
                }
            } else {
                sendToChannel(textChannel, 'This server does not have vvn1 premium. Message gardenweasel#1512')
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
