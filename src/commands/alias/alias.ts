import { CommandParams, commandProperties } from '../../bot'
import * as lodash from 'lodash'
import { TextChannel, Message, MessageEmbed } from 'discord.js'
import { Alias } from '../../db/controllers/guild.controller'
import { Prompt, Filter, sendToChannel } from '../../util/message.util'
import { extractActiveUsers, extractChannels } from '../../util/discord.util'
import { NumberConstants } from '../../util/constants'

import createAlias from './createalias'
import deleteAlias from './deleteAlias'
import viewAlias from './viewAlias'
const command: commandProperties = {
    name: 'alias',
    args: false,
    description: 'Launchpad for the alias commands',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,

    execute(e: CommandParams) {
        try {
            const options: Prompt.optionSelectElement[] = [
                {
                    name: 'Create new alias',
                    function: createAlias.execute,
                    args: e,
                },
                { name: 'View existing aliases', function: viewAlias.execute, args: e },
                { name: 'Delete aliases', function: deleteAlias.execute, args: e },
            ]

            Prompt.optionSelect(e.message.author.id, e.message.channel, options)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
