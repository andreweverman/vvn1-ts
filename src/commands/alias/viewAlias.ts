import { CommandParams, commandProperties } from '../../bot'
import * as lodash from 'lodash'
import { TextChannel, Message, MessageEmbed } from 'discord.js'
import { Alias } from '../../db/controllers/guildController'
import { Prompt, Filter, sendToChannel } from '../../util/messageUtil'
import { extractActiveUsers, extractChannels } from '../../util/discordUtil'
import { NumberConstants } from '../../util/constants'

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
