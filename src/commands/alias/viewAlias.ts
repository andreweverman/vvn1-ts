/**
 * Views aliases for a user/channel in mongo
 *
 * All aliases for a specified id are displayed.
 *
 * @file   Views mongo aliases for id
 * @author Andrew Everman.
 * @since  16.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { Message } from 'discord.js'
import { Alias } from '../../db/controllers/guildController'
import { Prompt, Filter } from '../../util/messageUtil'

const command: commandProperties = {
    name: 'viewalias',
    aliases: ['va', 'lookupalias'],
    args: false,
    description: 'View existing aliases for users and channels',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,

    execute(e: CommandParams) {
        return new Promise((resolve, reject) => {
            const textChannel = e.message.channel

            const options: Prompt.optionSelectElement[] = [
                { name: 'View alias for yourself', function: selectSelf },
                { name: 'View alias for a specified id', function: selectID },
            ]

            Prompt.optionSelect(e.message.author.id, e.message.channel, options).catch((error) => {
                throw error
            })

            async function selectSelf() {
                getAliases(e.message.author.id).catch((error) => {
                    throw error
                })
            }

            async function selectID() {
                const prompt = 'Please reply with the id for a user or channel:'

                const selectFilters: Filter.multipleFiltersInput = {
                    some: [Filter.validUserFilter(e.message.guild!), Filter.validChannelFilter(e.message.guild!)],
                }
                const filter = Filter.multipleFilters(selectFilters)

                Prompt.getSameUserInput(e.message.author.id, e.message.channel, prompt, filter)
                    .then((m: Message) => {
                        const id = m.content.trim()
                        getAliases(id).catch((error) => {
                            throw error
                        })
                    })
                    .catch((error) => {
                        Prompt.handleGetSameUserInputError(error, reject)
                    })
            }

            async function getAliases(id: string) {
                Alias.getAliasesByID(e.message.guild!.id, id, textChannel)
                    .then((aliases) => {
                        resolve(aliases)
                    })
                    .catch((error) => {
                        Prompt.handleGetSameUserInputError(error, reject)
                    })
            }
        })
    },
}

export default command
