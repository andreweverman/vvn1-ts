/**
 *
 * Entry point for the program
 *
 * Initializes discord bot
 * Connects to mongo
 * Links the events to their handlers
 * Spins up the batch job processor
 *
 * @file   Entry point for program
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import dotenv from 'dotenv'
dotenv.config()
import { Client, Collection, Message, REST, Events } from 'discord.js'
import 'fs'
import { Routes } from 'discord-api-types/v9'

import { getCommandFiles } from './util/fileUtil'
import guildCreateEvent from './events/guildCreateEvent'
import connect from './db/connect'

import mongoose from 'mongoose'
import { NumberConstants } from './util/constants'
import { findOrCreateGuild } from './db/controllers/guildController'
import {lookAtWrist} from './util/queue'

//@ts-ignore
mongoose.models = {}

export interface CommandParams {
    message: Message
    args: string[]
    client: Client
    prefix: string
    prod: boolean
    guildID?: string
    commands: Collection<string, commandProperties>
}

export interface commandProperties {
    name: string
    aliases?: string[]
    args: boolean
    description: string
    usage: string
    cooldown: number
    guildOnly: boolean
    execute: (event: CommandParams) => any
}

const dev: boolean = process.env.NODE_ENV == 'dev' ? true : false
const prod: boolean = process.env.prod == '1' ? true : false
export const client = new Client({
        intents: ['Guilds', 'GuildInvites', 'GuildMembers', 'GuildMessages', 'GuildVoiceStates'],
    }),
    commands: Collection<string, any> = new Collection(),
    cooldowns: Collection<string, Collection<string, number>> = new Collection()

client.once('ready', () => {
    console.log('Ready!')
})

// loading all of the commands
const commandsDeploy: any[] = []
const commandFiles: string[] | null = getCommandFiles()
if (!commandFiles) {
    !dev ? process.exit(1) : console.log('WARNING: There are no commands configured')
} else {
    for (const file of commandFiles) {
        const command = require(file).default
        if (!command.name && command.data) {
            commands.set(command.data.name, command)
            commandsDeploy.push(command.data.toJSON())
        } else if (command.type == 2) {
            commands.set(command.name, command)
            commandsDeploy.push(command)
        }
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!(interaction.isChatInputCommand() || interaction.isUserContextMenuCommand())) return

    const command = commands.get(interaction.commandName)

    if (!command) return

    try {
        await command.execute(interaction)
    } catch (error) {
        console.error(error)
        //         return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
    }
})
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot && message.author.id != process.env.BOT_USER_ID!) {
        try {
            setTimeout(() => {
                if (message.deletable){
                    message.delete()
                }
            }, NumberConstants.mins * 1)
        } catch (err) {
            console.log('Message was already deleted')
        }
    }
})

client.on(Events.GuildCreate, async (guild) => {
    guildCreateEvent(guild).catch((error) => {
        console.log(error)
    })
})

// discord connect
client.login(process.env.TOKEN)

// mongo connect
const db = process.env.MONGO_URL
if (!db) {
    console.log('No mongo url. Set MONGO_URL in .env')
    process.exit(1)
}
connect({ db })

function deployCommands(commands: any) {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!)

    const CLIENT_ID = process.env.CLIENT_ID!
    const GUILD_ID = process.env.GUILD_ID!

    rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error)
}

setTimeout(() => lookAtWrist(),5000)
// deployCommands(commandsDeploy)
