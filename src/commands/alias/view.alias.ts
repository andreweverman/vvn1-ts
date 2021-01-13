import { CommandParams, commandProperties } from '../../bot'
import * as lodash from 'lodash'
import { TextChannel, Message, MessageEmbed } from 'discord.js'
import { Alias } from '../../db/controllers/guild.controller'
import { Filter, Prompt, sendToChannel } from '../../util/message.util'
import { extractActiveUsers, extractChannels } from '../../util/discord.util'
import { NumberConstants } from '../../util/constants'
import {IAliasDoc} from '../../db/models/guild.model'
const command: commandProperties = {
    name: 'deletealias',
    aliases: ['da', 'removealias', 'ra'],
    args: false,
    description: 'Delete an existing alias',
    usage: ', then follow the prompts',
    cooldown: 1,
    guildOnly: true,

    execute(e: CommandParams) {
        const userID = e.message.author.id
        const textChannel = e.message.channel
        const guildID = e.message.guild!.id
        return new Promise(async (resolve, reject) => {
            const options: Prompt.optionSelectElement[] = [
                { name: 'Delete an alias for yourself', function: selectSelf },
                {
                    name: 'Delete an alias for a specified id',
                    function: selectID,
                },
            ]

            Prompt.optionSelect(e.message.author.id, e.message.channel, options).catch((error) => {
                reject(error)
            })

            async function selectSelf() {
                promptNames(e.message.author.id).catch((error) => {
                    throw error
                })
            }

            async function selectID() {
                const prompt = 'Please reply with the id for a user or channel:'

                const selectFilters: Filter.multipleFiltersInput = {
                    some: [Filter.validUserFilter(e.message.guild!), Filter.validChannelFilter(e.message.guild!)],
                }
                const filter = Filter.multipleFilters(selectFilters)

                Prompt.getSameUserInput(userID, textChannel, prompt, filter)
                    .then((m: Message) => {
                        const id = m.content.trim()
                        promptNames(id).catch((error) => {
                            throw error
                        })
                    })
                    .catch((error) => {
                        Prompt.handleGetSameUserInputError(error, reject)
                    })
            }

            async function promptNames(id: string) {
                Alias.getAliasesByID(guildID, id)
                    .then((aliasesResponse) => {
                        const aliases = aliasesResponse.aliases
                        const offset = 1
                        if (aliases == undefined) {
                            sendToChannel(textChannel, 'There are no aliases for this id. Quitting...', true)

                            resolve(true)
                            return
                        }
                        let content: string = aliases.map((x, i) => `${i + offset}: ${x.name}`).join('\n')
                        const msg = new MessageEmbed().addField(
                            `Aliases for id: ${id}\nYou can select multiple numbers with spaces between.`,
                            content,
                            true
                        )

                        Prompt.arraySelect(userID, textChannel, aliases, msg, {
                            customOffset: offset,
                            multiple: true,
                        })
                            .then((aliases) => {
                                let userAliases : IAliasDoc|IAliasDoc[]|undefined
                                if(aliases.arrayElement) userAliases = aliases.arrayElement
                                if(aliases.arrayElements) userAliases = aliases.arrayElements
                            
                                if(userAliases==undefined) return undefined
                                
                                Alias.deleteAliases(guildID, userAliases, textChannel)
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
                    })
                    .catch((error) => {
                        throw error
                    })
            }
        })
    },
}

export default command