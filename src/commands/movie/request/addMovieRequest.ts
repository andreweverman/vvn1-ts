import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Guild, Config, Movie } from '../../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { ConfigUtil, MovieUtil } from '../../../util/general.util'
import { replyUtil } from '../../../util/message.util'
import { readyCheck } from '../../../util/discord.util'
const command: commandProperties = {
    name: 'addmovierequest',
    description: 'Adds a request for a movie to be added to the list',
    aliases: ['addrequest', 'request', 'requestmovie'],
    guildOnly: true,
    usage: 'Follow the prompts!',
    cooldown: 0,
    args: false,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const args = {
                userID: userID,
                guildID: guildID,
                textChannel: textChannel,
            }

            const movieName = await MovieUtil.Prompt.promptMovieName(args)
            Movie.addRequest(guildID,userID,movieName,textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command