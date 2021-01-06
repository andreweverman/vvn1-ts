import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Guild, Config, Movie } from '../../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { ConfigUtil } from '../../../util/general.util'
import { replyUtil } from '../../../util/message.util'
import { readyCheck } from '../../../util/discord.util'
const command: commandProperties = {
    name: 'deletemovierequest',
    description: 'Deletes a movie request',
    aliases: ['deleterequest', 'rmrequest'],
    guildOnly: true,
    usage: 'Follow the prompts!',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const { requestedMovies, message } = await Movie.getUserRequestedMovies(guildID, userID)

            const m = await Prompt.arraySelect(userID, textChannel, requestedMovies, message, {
                multiple: false,
            })

            if (m.arrayElement) {
                Movie.deleteRequestedMovie(guildID, userID, m.arrayElement, textChannel)
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
