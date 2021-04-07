/**
 *
 * Event handler for when invited to a guild
 *
 * If a guild is not found in the db,
 * initialize the document in mongo
 *
 *
 * @file   Guild invite event
 * @author Andrew Everman.
 * @since  29.10.2020
 */

import { Guild as GuildD } from 'discord.js'
import { Guild } from '../db/controllers/guildController'

async function guildCreate(guild: GuildD) {
    try {
        await Guild.getGuild(guild.id).catch((err) => {
            if (err == undefined) {
                Guild.initializeGuild(guild.id)
            }
        })
    } catch (error) {
        throw error
    }
}

export default guildCreate
