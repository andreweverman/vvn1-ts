import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/message.util'
import { Link } from '../../db/controllers/guild.controller'
import { ILink } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { reject } from 'lodash'

const command: commandProperties = {
    name: 'viewlink',
    aliases: ['links'],
    args: false,
    description: 'View all links for this server',
    usage: ``,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const textChannel = e.message.channel
            Link.viewLinks(guildID, textChannel)
        } catch (error) {
            throw error
        }
    },
}

export default command
