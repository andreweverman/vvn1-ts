import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/messageUtil'
import { Link } from '../../db/controllers/guildController'
import { ILink } from '../../db/models/guildModel'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/stringUtil'
import { reject } from 'lodash'

import createLink from './createLink'
import deleteLink from './deleteLink'
import editLink from './editLink'
import viewLink from './viewLink'
const command: commandProperties = {
    name: 'link',
    args: false,
    description: 'Launcpad for the link related commands',
    usage: ``,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const options: Prompt.optionSelectElement[] = [
                { name: 'View existing links', function: viewLink.execute, args: e },
                { name: 'Add new link', function: createLink.execute, args: e },
                { name: 'Edit existing link', function: editLink.execute, args: e },
                { name: 'Delete a link', function: deleteLink.execute, args: e },
            ]

            Prompt.optionSelect(e.message.author.id, e.message.channel, options)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
