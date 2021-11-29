/**
 * Views stored links from mongo.
 *
 * Straightforward for now. Just dumps the links
 * Will probably run into an issue if we get too many with the current
 * implementation. Will look into it when that day arrives.
 *
 * @file   Views stored links from mongo.
 * @author Andrew Everman.
 * @since  17.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { Link } from '../../db/controllers/guildController'
import { ILinkDoc } from '../../db/models/guildModel'
import { NumberConstants } from '../../util/constants'
import { Prompt, sendToChannel } from '../../util/messageUtil'

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
            const userID = e.message.author.id
            const guildID = e.message.guild!.id
            const textChannel = e.message.channel
            const res = await Link.viewLinks(guildID)
            const arrSel = await Prompt.arraySelect(
                userID,
                textChannel,
                res.links,
                (link: ILinkDoc) => `[${link.names.join(', ')}](${link.link} 'Download Link')`,
                'All Links/Clips',
                { time: 10 * NumberConstants.mins,}
            )
        } catch (error) {
            throw error
        }
    },
}

export default command
