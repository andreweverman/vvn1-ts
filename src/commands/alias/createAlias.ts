/**
 * Creates an alias for a user/channel in mongo
 *
 * Alias is created in mongo if that alias is not currently 
 * in use by another user. Checks in this file.
 * 
 * @file   This file is executed from the bot.js file
 * @author Andrew Everman.
 * @since  16.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import {  Message } from 'discord.js'
import { Alias } from '../../db/controllers/guildController'
import { Prompt, Filter } from '../../util/messageUtil'
import { validGuildMember, extractChannels } from '../../util/discordUtil'

const command: commandProperties = {
    name: 'createalias',
    aliases: ['ca', 'addalias'],
    args: false,
    description:
        'Creates aliases for voice channels and users for certain ids. This is helpful for when you want to move someone',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,

    execute(e: CommandParams) {
        return new Promise(async (resolve, reject) => {
            const options: Prompt.optionSelectElement[] = [
                { name: 'Create alias for yourself', function: selectSelf },
                { name: 'Create alias by id', function: selectID },
            ]

            Prompt.optionSelect(e.message.author.id, e.message.channel, options).catch((error) => {
                throw error
            })

            async function selectSelf() {
                promptNames(e.message.author.id, Alias.Types.text)
            }

            async function selectID() {
                const prompt = 'Please reply with the id for a user or channel:'

                const selectFilters: Filter.multipleFiltersInput = {
                    some: [Filter.validUserFilter(e.message.guild!), Filter.validChannelFilter(e.message.guild!)],
                }
                const filter = Filter.multipleFilters(selectFilters)

                Prompt.getSameUserInput(e.message.author.id, e.message.channel, prompt, filter)
                    .then((m: Message) => {
                        const extractedUsers = validGuildMember(m.content, e.client)
                        const extractedChannels = extractChannels(m.content, e.message.guild!)

                        let id: string
                        let type: Alias.Types
                        if (extractedUsers.length > 0) {
                            id = extractedUsers[0].id
                            type = Alias.Types.user
                        } else {
                            id = extractedChannels[0].id
                            type = extractedChannels[0].type == Alias.Types.text ? Alias.Types.text : Alias.Types.voice
                        }
                        promptNames(id, type)
                    })
                    .catch((error) => {
                        Prompt.handleGetSameUserInputError(error, reject)
                    })
            }

            async function promptNames(id: string, type: Alias.Types) {
                const prompt =
                    'Enter the aliases that you would like to add (one word, can add multiple with spaces between):'

                Prompt.getSameUserInput(e.message.author.id, e.message.channel, prompt, Filter.anyFilter())
                    .then((m: Message) => {
                        const names = m.content.trim().split(' ')
                        Alias.createAlias(e.message.guild!.id, { id, type }, names, e.message.channel)
                            .then(() => {
                                resolve(true)
                            })
                            .catch((error) => {
                                throw error
                            })
                    })
                    .catch((error) => {
                        Prompt.handleGetSameUserInputError(error, reject)
                    })
            }
        })
    },
}

export default command
