import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Guild, Config, Movie } from '../../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { ConfigUtil } from '../../../util/general.util'
import { replyUtil } from '../../../util/message.util'
import { readyCheck } from '../../../util/discord.util'
import { NumberConstants } from '../../../util/constants'
const command: commandProperties = {
    name: 'viewmovierequests',
    description: 'View the existing movie reuqests',
    aliases: ['viewrequests', 'requests'],
    guildOnly: true,
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const textChannel = e.message.channel

            const { requestedMovies, message } = await Movie.getRequestedMovies(guildID)

            return sendToChannel(
                textChannel,
                message,
                true,
                requestedMovies.length > 0 ? 10 * NumberConstants.mins : 15 * NumberConstants.secs
            )
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
