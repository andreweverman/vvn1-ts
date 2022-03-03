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

import { Client, Collection, Message, TextChannel, User } from 'discord.js'
import dotenv from 'dotenv'
import 'fs'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9';

import { NumberConstants } from './util/constants'
import { getCommandFiles } from './util/fiileUtil'
import messageEvent from './events/messageEvent'
import guildCreateEvent from './events/guildCreateEvent'
import connect from './db/connect'
import { runJobs } from './jobs/runner'
import { Guild } from './db/controllers/guildController'

import mongoose from 'mongoose'
//@ts-ignore
mongoose.models = {}
dotenv.config()

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
    intents: ['GUILDS', 'GUILD_INVITES', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_VOICE_STATES'],
}),
    commands: Collection<string, any> = new Collection(),
    cooldowns: Collection<string, Collection<string, number>> = new Collection()

client.once('ready', () => {
    console.log('Ready!')
})

// loading all of the commands
const commandsDeploy: string[] = []
const commandFiles: string[] | null = getCommandFiles()
if (!commandFiles) {
    !dev ? process.exit(1) : console.log('WARNING: There are no commands configured')
} else {
    for (const file of commandFiles) {
        const command = require(file).default
        if (!command.name) {
            commands.set(command.data.name, command)
            commandsDeploy.push(command.data.toJSON());
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.on('messageCreate', async (message) => {
    // todo get this from mongo again
    messageEvent(message, client).catch((error) => {
        // todo: use winston to log this
        console.log(error)
    })
})



client.on('guildCreate', async (guild) => {
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

// runJobs()

function deployCommands(commands: any) {
    const rest = new REST({ version: '9' }).setToken(process.env.TOKEN!);


    rest.put(Routes.applicationGuildCommands('563969098950639636', '135977616057434112'), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);
}

deployCommands(commandsDeploy)
