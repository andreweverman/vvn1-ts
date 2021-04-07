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
