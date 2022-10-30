/**
 * Helps the users use the bot.
 * 
 * Help alone will list commands.
 * Help with a command name will show how to use that command.
 * 
 * @file   Helps user use bot
 * @author Andrew Everman.
 * @since  19.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { sendToChannel, sendUtil } from '../../util/messageUtil'
import { Config } from '../../db/controllers/guildController'
import { replyUtil } from '../../util/messageUtil'
import { NumberConstants } from '../../util/constants'

const command: commandProperties = {
    name: 'help',
    description: 'List of all commmand or info about a specific one',
    aliases: ['commands'],
    usage: '[command name]',
    cooldown: 0,
    args: false,
    guildOnly: true,

    async execute(e: CommandParams) {
        const data = []
        const commands = e.commands

        const prefix = await Config.getGuildPrefix(e.message.guild!.id)

        if (!e.args.length) {
            data.push("Here's a list of all my commands:")
            data.push(commands.map((command) => command.name).join(', '))
            data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`)

            sendUtil(e.message.channel.send({content:data.join('\n')}),true, 2 * NumberConstants.mins)

            return
        }

        const name = e.args[0].toLowerCase()
        const command = commands.get(name) || commands.find((c) => c.aliases!=undefined && c.aliases.includes(name))

        if (!command) {
            return replyUtil(e.message, "that's not a valid command!")
        }

        data.push(`**Name:** ${command.name}`)

        if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`)
        if (command.description) data.push(`**Description:** ${command.description}`)
        if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`)

        data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`)
        sendToChannel(e.message.channel, {content: data.join('\n')}, true,1 * NumberConstants.mins)
    },
}

export default command
