/**
 * Central command for all alias related commands
 * 
 * Launch other commands from this central location if you can't remember the names
 * 
 * @file   All alias commands
 * @author Andrew Everman.
 * @since  16.2.2021
 */

import { CommandParams, commandProperties } from '../../bot'
import { Prompt } from '../../util/messageUtil'

import createAlias from './createAlias'
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


