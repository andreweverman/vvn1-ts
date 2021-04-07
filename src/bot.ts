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

import { NumberConstants } from './util/constants'
import { getCommandFiles } from './util/fiileUtil'
import messageEvent from './events/messageEvent'
import messageDeleteEvent from './events/messageDeleteEvent'
import guildCreateEvent from './events/guildCreateEvent'
import connect from './db/connect'
import {runJobs} from './jobs/runner'

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

export interface commandCollection extends Collection<string, commandProperties> {}

export interface commandCooldowns extends Collection<string, Collection<string, number>> {}

const dev: boolean = process.env.NODE_ENV == 'dev' ? true : false
const prod: boolean = process.env.prod == '1' ? true : false
export const client = new Client(),
    commands: Collection<string, commandProperties> = new Collection(),
    cooldowns: Collection<string, Collection<string, number>> = new Collection()

client.once('ready', () => {
    console.log('Ready!')
})

// loading all of the commands
const commandFiles: string[] | null = getCommandFiles()
if (!commandFiles) {
    !dev ? process.exit(1) : console.log('WARNING: There are no commands configured')
} else {
    for (const file of commandFiles) {
        const command = require(file).default
        commands.set(command.name, command)
    }
}

client.on('message', async (message) => {
    // todo get this from mongo again
    messageEvent(message, client, commands, cooldowns, prod).catch((error) => {
        // todo: use winston to log this
        console.log(error)
    })
})

client.on('messageDelete', async (message) => {
    messageDeleteEvent(message).catch((error) => {
        console.log(error)
    })
})

client.on('guildCreate',async(guild) =>{
    guildCreateEvent(guild).catch((error) =>{
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

runJobs()