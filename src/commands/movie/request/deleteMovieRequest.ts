import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/messageUtil'
import { Link, Guild, Config, Movie } from '../../../db/controllers/guildController'
import { ILink, ILinkDoc } from '../../../db/models/guildModel'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/stringUtil'
import { ConfigUtil } from '../../../util/generalUtil'
import { replyUtil } from '../../../util/messageUtil'
import { readyCheck } from '../../../util/discordUtil'
const command: commandProperties = {
    name: 'deletemovierequest',
    description: 'Deletes a movie request',
    aliases: ['deleterequest', 'rmrequest'],
    guildOnly: true,
    usage: ', then follow the prompts',
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
