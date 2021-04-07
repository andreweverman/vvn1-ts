/**
 * Deletes an link in mongo
 *
 * User is presented with available links and clips currently in the channel.
 * They can select one or more to delete in one go
 * 
 * @file   Link is deleted in mongo.
 * @author Andrew Everman.
 * @since  16.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { Prompt} from '../../util/messageUtil'
import { Link } from '../../db/controllers/guildController'

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
