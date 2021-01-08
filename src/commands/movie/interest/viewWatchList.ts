import { CommandParams, commandProperties } from '../../../bot'
import { Prompt, Filter, sendToChannel } from '../../../util/message.util'
import { Link, Movie } from '../../../db/controllers/guild.controller'
import { ILink } from '../../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../../util/string.util'
import { AliasUtil, MovieUtil } from '../../../util/general.util'
import { NumberConstants } from '../../../util/constants'

const command: commandProperties = {
    name: 'viewwatchlist',
    aliases: ['watchlist'],
    description: 'View what movies are on your watchlist',
    usage: '',
    cooldown: 0,
    args: false,
    guildOnly: true,
    async execute(e: CommandParams) {
        const userID = e.message.author.id
        const guildID = e.message.guild!.id
        const textChannel = e.message.channel

       const {message} = await Movie.getWatchListForMember(guildID,userID,e.message.guild!,false)

       sendToChannel(textChannel,message,true,1* NumberConstants.mins)
    },
}

export default command
