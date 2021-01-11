import { Message, Collection, Client } from 'discord.js'
import { commandCollection, commandCooldowns } from '../bot'
import { NumberConstants } from '../util/constants'
import { deleteMessage, replyUtil, sendToChannel } from '../util/message.util'
import { Config, Link } from '../db/controllers/guild.controller'
import playAudio from '../commands/indirect/playAudio'
import { IConfigDoc } from '../db/models/guild.model'
async function messageEvent(
    message: Message,
    client: Client,
    commands: commandCollection,
    cooldowns: commandCooldowns,
    prod: boolean
): Promise<string> {
    return new Promise(async (resolve, reject) => {
        // getting the guild prefix if it is a guild message
        let configDoc: IConfigDoc | undefined = undefined
        let guildPrefix: string = ''
        const guildID: string | undefined = message.guild?.id
        if (guildID) {
            try {
                configDoc = await Config.getGuildConfig(guildID)
                guildPrefix = configDoc.prefix
            } catch (error) {
                console.error(error)
            }
        }

        // rollback prefix if can't find one
        const hardPrefix = prod ? process.env.PROD_PREFIX : process.env.DEV_PREFIX
        if (!hardPrefix) {
            console.error('Please set the DEV_PREFIX and/or PROD_PREFIX in the .env file')
            process.exit(1)
        }

        // resolving final prefix that we will search for to do the command
        const prefix = guildPrefix != '' && prod ? guildPrefix : hardPrefix
        const args = message.content.slice(prefix.length).split(/ +/)
        const commandName = args.shift()?.toLowerCase()

        const escape_regex = new RegExp(/[-\/\\^$*+?.()|[\]{}]/g)
        const is_command = new RegExp('^[/s]*' + prefix.replace(escape_regex, '\\$&') + '[/w]*').test(message.content)

        // TODO: autodelete message flow here
        if (configDoc) {
            const autoDeletePrefix = configDoc.autodelete.find(
                (x) => message.content.startsWith(x.matchOn) && x.type == Config.AutoDeleteType.prefix
            )

            if (autoDeletePrefix) {
                const startsWithMatch = (str: string) => new RegExp(`^${autoDeletePrefix.matchOn}${str}`, 'i')
                const specified = autoDeletePrefix.specified.find((x) =>
                    startsWithMatch(x.startsWith).test(message.content.trim())
                )
                const whitelisted = autoDeletePrefix.allowList.find((x) =>
                    startsWithMatch(x).test(message.content.trim())
                )
                if (specified) {
                    deleteMessage(message, specified.timeToDelete * NumberConstants.secs)
                }
                if ((!autoDeletePrefix.allowMode && !whitelisted) || (autoDeletePrefix.allowMode && whitelisted)) {
                    deleteMessage(message, autoDeletePrefix.defaultDeleteTime)
                }
            }
            const autoDeleteMember = configDoc.autodelete.find(
                (x) => message.author.id == x.matchOn && x.type == Config.AutoDeleteType.user
            )

            if (autoDeleteMember) {
                const startsWithMatch = (str: string) => new RegExp(`${str}`, 'i')
                const specified = autoDeleteMember.specified.find((x) =>
                    startsWithMatch(x.startsWith).test(message.content.trim())
                )
                const whitelisted = autoDeleteMember.allowList.find((x) =>
                    startsWithMatch(x).test(message.content.trim())
                )
                if (specified) {
                    deleteMessage(message, specified.timeToDelete * NumberConstants.secs)
                }
                if ((!autoDeleteMember.allowMode && !whitelisted) || (autoDeleteMember.allowMode && whitelisted)) {
                    deleteMessage(message, autoDeleteMember.defaultDeleteTime)
                }
            }
        }

        // not a command, get out
        if (!is_command || message.author.bot) return

        if (!commandName) {
            console.log('Somehow got a command without a command name')
            reject('command no name')
            return
        }
        

        const command =
            commands.get(commandName) ||
            commands.find((cmd) => cmd.aliases != undefined && cmd.aliases.includes(commandName))

        if (!command) {
            try {
                // TODO : the links stuff
                if (message.guild) {
                    const guild_id = message.guild.id
                    const link = await Link.lookupLink(guild_id, commandName)

                    if (link && link.type == 'clip') {
                        // voice clip
                        if (message.member && message.member.voice) {
                            const vc = message.member.voice.channel

                            if (vc) {
                                playAudio(vc, link, message.channel).catch((err) => console.log(err))
                            } else {
                                replyUtil(message, 'You must be connected to a voice channel to use this command')
                            }
                        }
                    } else if (link && link.type == 'link') {
                        // static link
                        // just sending them the link
                        sendToChannel(message.channel, link.link, true, 10 * NumberConstants.mins)
                    } else {
                        sendToChannel(message.channel, 'This is not a command I know of.')
                        deleteMessage(message, 15 * NumberConstants.secs)
                    }

                    return
                } else {
                    sendToChannel(message.channel, 'This is not a command I know of.')
                    deleteMessage(message, 15 * NumberConstants.secs)
                }
            } catch (error) {
                console.error('Error in link messageEvent: ' + error)
            }
        } else {
            deleteMessage(message, 15 * NumberConstants.secs)
            if (command.args && !args.length) {
                let reply = `You didn't provide any arguments for a command that requires them.`

                if (command.usage) {
                    reply += `\nThe proper usage would be something like: ${command.usage}`
                }

                sendToChannel(message.channel, reply)
                reject('incorrect usage of command')
            } else {
                if (command.guildOnly && message.channel.type !== 'text') {
                    replyUtil(message, "I can't execute that command inside DMs!", false)
                    return
                }

                //setting cooldown information
                if (!cooldowns.has(command.name)) {
                    cooldowns.set(command.name, new Collection())
                }

                const now = Date.now()
                const timestamps = cooldowns.get(command.name)
                const cooldownAmount = (command.cooldown || 1) * NumberConstants.secs

                if (timestamps && timestamps.has(message.author.id)) {
                    const expirationTime = timestamps.get(message.author.id)! + cooldownAmount

                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / NumberConstants.secs
                        replyUtil(
                            message,
                            `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${
                                command.name
                            }\` command.`,
                            true,
                            10 * NumberConstants.secs
                        ).catch((error) => console.error(error))
                        reject('command was on cooldown')
                    }
                } else if (timestamps) {
                    timestamps.set(message.author.id, now)
                    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount)

                    try {
                        //running the command
                        command.execute({
                            message,
                            client,
                            args,
                            prod: prod,
                            guildID,
                            prefix,
                            commands: commands,
                        })

                        resolve('good')
                    } catch (error) {
                        console.error(error)
                        sendToChannel(message.channel, 'Error executing command on my end. Sorry!', true)
                        reject('error executing command')
                    }
                }
            }
        }
    })
}

export default messageEvent