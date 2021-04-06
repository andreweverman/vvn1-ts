import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/messageUtil'
import { Link } from '../../db/controllers/guildController'
import { ILink } from '../../db/models/guildModel'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/stringUtil'

const command: commandProperties = {
    name: 'deletelink',
    aliases: ['removelink'],
    args: false,
    description: 'View all links for this server',
    usage: ``,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const link = await Link.selectLink(guildID, userID, textChannel, true)

            if (!link) return undefined

            return await Link.deleteLink(guildID, link, textChannel)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
