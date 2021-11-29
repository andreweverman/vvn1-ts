/**
 *
 * Utility for all Discord message related thigns
 *
 * Defines the way that we handle all our IO with the user
 * Prompt is used in most of the functions
 *
 * @file   Utility for Discord message things
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import {
    Message,
    MessageEmbed,
    TextChannel,
    CollectorFilter,
    DMChannel,
    NewsChannel,
    Guild,
    GuildEmoji,
    EmbedField,
    EmbedFieldData,
    MessagePayload,
    MessageOptions,
    ThreadChannel,
    TextBasedChannels,
} from 'discord.js'
import { NumberConstants, quit, valid, messageCollectorTimeout, extraStringOption } from './constants'
import { stringMatch, matchOptions, spaceCommaRegex, guildEmojiRegex } from './stringUtil'
import { timeInPast, TimeInPastOptions, dateInPast } from './timeUtil'
export type AsyncCollectorFilter = (...args: any[]) => Promise<boolean>
export type AnyCollectorFilter = AsyncCollectorFilter | CollectorFilter<any>

export namespace Filter {
    export interface multipleFiltersInput {
        every?: AnyCollectorFilter[]
        some?: AnyCollectorFilter[]
    }
    export function multipleFilters(filters: multipleFiltersInput): AsyncCollectorFilter {
        return async (m: Message) => {
            return new Promise(async (resolve, reject) => {
                let everyRes: boolean = false
                let someRes: boolean = false
                if (!filters.every || filters.every.length == 0) {
                    everyRes = true
                } else {
                    const everyPromises = filters.every.map((x) => x(m))
                    const everyPromiseResults = await Promise.all(everyPromises)
                    everyRes = everyPromiseResults.every((x) => x)
                }
                if (!filters.some || filters.some.length == 0) {
                    someRes = true
                } else {
                    const onePromises = filters.some.map((x) => x(m))
                    const onePromiseResults = await Promise.all(onePromises)
                    someRes = onePromiseResults.some((x) => x)
                }
                try {
                    resolve(everyRes && someRes)
                } catch (error) {
                    reject(error)
                }
            })
        }
    }

    export function anyFilter(): CollectorFilter<any> {
        return () => true
    }

    // both are inclusive
    export interface numberRangeFilterOptions {
        integerOnly?: boolean
        multipleInputAllowed?: boolean
    }

    export function numberRangeFilter(
        min: number,
        max: number,
        options?: numberRangeFilterOptions
    ): CollectorFilter<any> {
        const multiple = options?.multipleInputAllowed == true
        const parseFunc = options?.integerOnly == false ? parseFloat : parseInt

        return (response: Message) => {
            const validNumber = function (content: string): boolean {
                const num_resp = parseFunc(content)
                return num_resp != NaN && num_resp <= max && num_resp >= min
            }

            const trimmedContent = response.content.trim()
            return multiple ? trimmedContent.split(' ').every((x) => validNumber(x)) : validNumber(trimmedContent)
        }
    }

    export function quitFilter(): CollectorFilter<any> {
        return (m: Message) => m.content.trim().toLowerCase() == 'quit'
    }

    export function sameUserFilter(userID: string): CollectorFilter<any> {
        return (m: Message) => m.author.id === userID
    }

    export function uniqueInputFilter(inputs: string[]): CollectorFilter<any> {
        return (response: Message) => !inputs.includes(response.content.trim())
    }

    export function validUserFilter(guild: Guild): CollectorFilter<any> {
        return (response: Message) => {
            return response.mentions.users.first() != undefined
        }
    }

    export function validChannelFilter(guild: Guild, specificType?: string): CollectorFilter<any> {
        return (response: Message) =>
            response.content
                .trim()
                .split(' ')
                .some((x) => {
                    const channel = guild.channels.resolve(x)
                    let specificOk = specificType != undefined ? specificType == channel?.type : true
                    return channel && specificOk
                })
    }

    export function stringFilter(str: string, options: matchOptions): CollectorFilter<any> {
        const regex = stringMatch(str, options)
        const minLengthEnabled: boolean = options.minLength != undefined
        const maxLengthEnabled: boolean = options.maxLength != undefined
        let filterLength: any = () => true
        if (minLengthEnabled || maxLengthEnabled) {
            filterLength = (str: string): boolean => {
                if (options.minLength != undefined) {
                    if (str.length < options.minLength) {
                        return false
                    }
                }
                if (options.maxLength != undefined) {
                    if (str.length > options.maxLength) {
                        return false
                    }
                }
                return true
            }
        }

        return (response: Message) => {
            const inputStr = options.trimInput == false ? response.content : response.content.trim()
            return regex.test(inputStr) && filterLength(inputStr)
        }
    }

    export function stringLengthFilter(maxLength = 0, minLength = 0): CollectorFilter<any> {
        return (response: Message) => {
            const content = response.content.trim()
            return content.length >= minLength && content.length <= maxLength
        }
    }

    export function regexFilter(regex: RegExp, trimInput = true): CollectorFilter<any> {
        return (response: Message) => {
            return regex.test(trimInput ? response.content.trim() : response.content)
        }
    }

    export function notInPastFilter(timeZoneName: string, options?: TimeInPastOptions): CollectorFilter<any> {
        return (response: Message) => {
            const inPast = timeInPast(timeZoneName, response.content.trim(), options)
            return !inPast
        }
    }

    export function dateNotInPastFilter(timeZoneName: string): CollectorFilter<any> {
        return (response: Message) => {
            const inPast = dateInPast(timeZoneName, response.content.trim())
            return !inPast
        }
    }

    export function validEmojiFilter(): CollectorFilter<any> {
        return (response: Message) => {
            const name = response.content.trim()
            const guild_emoji = guildEmojiRegex.test(name)
            let validGuildEmoji: GuildEmoji | undefined = undefined
            if (guild_emoji) {
                validGuildEmoji = response.guild!.emojis.cache.find((x) => {
                    let val = `<:${x.identifier}>` == name
                    return val
                })
            }
            return validGuildEmoji != undefined
        }
    }
}

export type DeleteResponse = Message | boolean
export function deleteMessage(message: Message, time: number): Promise<DeleteResponse> {
    return new Promise((resolve, reject) => {
        if (message.channel.type != 'GUILD_TEXT') resolve(true)

        setTimeout(() => {
            message
                .delete()
                .then((deletedMessage: Message) => {
                    resolve(deletedMessage)
                })
                .catch((error: any) => {
                    if (error.httpStatus != 404) {
                        reject(error)
                    } else {
                        resolve(true)
                    }
                })
        }, time)
    })
}

export interface sendUtilResponse {
    messages: Message[]
    deleteResponses: Promise<DeleteResponse>[]
}

export function sendUtil(
    message: Promise<Message | Message[]>,
    autoDelete: boolean,
    autoDeleteTime = 15 * NumberConstants.secs
): Promise<sendUtilResponse> {
    const result: sendUtilResponse = {
        messages: [],
        deleteResponses: [],
    }

    const postSend = (sentMessage: Message) => {
        result.messages.push(sentMessage)
        if (autoDelete) {
            result.deleteResponses.push(deleteMessage(sentMessage, autoDeleteTime))
        }
    }

    return new Promise((resolve, reject) => {
        message
            .then(async (sentMessage: Message | Message[]) => {
                if (!Array.isArray(sentMessage)) {
                    postSend(sentMessage)
                } else {
                    sentMessage.forEach((individualMessage) => {
                        postSend(individualMessage)
                    })
                }

                resolve(result)
            })
            .catch((error: Error) => {
                reject(error)
            })
    })
}

export interface sendPaginationOptions {
    userID: string
    embeds: MessageEmbed[]
}
export function sendToChannel(
    channel: TextBasedChannels,
    statement: string | MessagePayload | MessageOptions,
    autoDelete = true,
    autoDeleteTime = 15 * NumberConstants.secs,
    paginationOptions?: sendPaginationOptions
) {
    const sendRes = sendUtil(channel.send(statement), autoDelete, autoDeleteTime).then((res) => {
        if (paginationOptions) {
            Prompt.setPaginationReaction(res.messages[0], paginationOptions.embeds, paginationOptions.userID)
        }
        return res
    })

    return sendRes
}

export function replyUtil(
    message: Message,
    statement: string | MessagePayload | MessageOptions,
    autoDelete = true,
    time = 15 * NumberConstants.secs
): Promise<sendUtilResponse> {
    return sendUtil(message.reply(statement), autoDelete, time)
}

export namespace Prompt {
    export interface gsuiReject {
        reason: string
        throwError: boolean
        lastMessage?: Message
        error?: Error
    }
    export interface GSUIOptions {
        extraStringOptions?: string[]
        time?: number
        pagination?: boolean
        paginationEmbeds?: MessageEmbed[]
    }
    // want to return the message
    //todo make the userID an optional arry
    export async function getSameUserInput(
        userID: string,
        textChannel: TextBasedChannels,
        messagePrompt: string | MessagePayload | MessageOptions,
        filter: AnyCollectorFilter,
        options?: GSUIOptions
    ): Promise<Message> {
        return new Promise((resolve, reject) => {
            const time = options?.time ? options.time : 2 * NumberConstants.mins

            textChannel
                .send(messagePrompt)
                .then((promptMessage: Message) => {
                    // this first filter is just to make sure the message is from the user.
                    // the collected messages are then further filtered
                    const messageCollector = textChannel.createMessageCollector({
                        filter: Filter.sameUserFilter(userID),
                        time: time,
                    })

                    // if (options?.pagination && options?.paginationEmbeds) {
                    //     setPaginationReaction(promptMessage, options.paginationEmbeds, userID)
                    // }

                    messageCollector.on('collect', async (m: Message) => {
                        // valid response. need to further filter and respond accordingly
                        let completed: Boolean = true

                        const filterResult = await filter(m)
                        if (filterResult) {
                            resolve(m)
                            messageCollector.stop(valid)
                        } else if (Filter.quitFilter()(m)) {
                            messageCollector.stop(quit)
                        } else if (options?.extraStringOptions) {
                            if (options?.extraStringOptions.includes(m.content.trim())) {
                                resolve(m)
                                messageCollector.stop(extraStringOption)
                            } else {
                                completed = false
                            }
                        } else {
                            completed = false
                        }

                        if (completed == false) {
                            sendToChannel(
                                textChannel,
                                'Invalid response. Please try again.',
                                true,
                                10 * NumberConstants.secs
                            )
                        }

                        if (completed)
                            deleteMessage(promptMessage, 10 * NumberConstants.secs).catch((error) => {
                                console.error(error)
                            })
                        deleteMessage(m, 10 * NumberConstants.secs).catch((error) => console.error(error))
                    })

                    messageCollector.on('end', (collected, reason) => {
                        if (!promptMessage.deleted) promptMessage.delete()
                        let rej: gsuiReject
                        const lastMessage = collected.last()
                        if (lastMessage == undefined) {
                            rej = {
                                reason: 'Timeout',
                                throwError: false,
                                lastMessage: lastMessage,
                            }
                            reject(rej)
                            return
                        }

                        if ([quit, messageCollectorTimeout].includes(reason)) {
                            const msg: string =
                                reason == messageCollectorTimeout ? 'No reponse. Quitting...' : 'Quitting...'
                            sendToChannel(textChannel, msg, true, 10 * NumberConstants.secs)
                                .then(() => {
                                    rej = {
                                        reason: reason,
                                        throwError: false,
                                        lastMessage: lastMessage,
                                    }
                                    reject(rej)
                                })
                                .catch((err) => {
                                    let rej: gsuiReject = {
                                        reason: 'Error sending sending response message',
                                        throwError: true,
                                        error: err,
                                    }
                                    reject(rej)
                                })
                        }
                    })
                })
                .catch((err) => {
                    let rej: gsuiReject = {
                        reason: 'Error sending prompt message',
                        throwError: true,
                        error: err,
                    }
                    reject(rej)
                })
        })
    }

    export function handleGetSameUserInputError(errorResponse: any, reject?: Function) {
        if (errorResponse.throwError) {
            if (!reject) {
                throw errorResponse
            } else {
                reject(errorResponse)
            }
        }
    }

    export function getMultipleInput(
        userID: string,
        textChannel: TextBasedChannels,
        filter: AsyncCollectorFilter | CollectorFilter<any>,
        numberOfInputs: number,
        unique = true
    ): Promise<string[]> {
        return new Promise(async (resolve, reject) => {
            const inputs: string[] = []

            const fullFilter = !unique
                ? filter
                : Filter.multipleFilters({
                      every: [filter],
                      some: [Filter.uniqueInputFilter(inputs)],
                  })

            for (let i = 0; i < numberOfInputs; i++) {
                const prompt = `Select your ${i + 1} choice: (quit to stop)`

                try {
                    const receivedMessage = await getSameUserInput(userID, textChannel, prompt, fullFilter)

                    if (!receivedMessage) {
                        reject(null)
                    } else {
                        inputs.push(receivedMessage.content.trim())
                    }
                } catch (error) {
                    console.error(error)
                    reject(error)
                }
            }
            resolve(inputs)
        })
    }

    export interface optionSelectOptions {
        customOffset?: number
        time?: number
        extraPrompt?: string
    }
    export interface optionSelectElement {
        name: string
        function: Function
        args?: any
    }
    /*
    TODO: configure this so that you can do a value instead, and have it select multiple values;
    ex, for delete selection, send in array of those documents. option select selects the array values
    and the filtered array gets passed back to caller
     */
    export function optionSelect(
        userID: string,
        textChannel: TextBasedChannels,
        functionArray: optionSelectElement[],
        options?: optionSelectOptions
    ): Promise<any> {
        const time = options?.time ? options.time : 15 * NumberConstants.mins
        const offset = options?.customOffset ? options.customOffset : 1
        const extraPrompt = options?.extraPrompt ? options.extraPrompt : ''
        return new Promise(async (resolve, reject) => {
            const optionsString =
                extraPrompt +
                `${extraPrompt != '' ? '\n' : ''}` +
                'Reply with the number of the option you would like to select:\n' +
                functionArray.map((option, i) => `${i + offset}. ${option.name}`).join('\n') +
                `\n(or "quit" to exit)`

            const optionFilter = Filter.numberRangeFilter(offset, functionArray.length)

            try {
                const userSelectionMsg = await getSameUserInput(userID, textChannel, optionsString, optionFilter, {
                    time: time,
                })

                const optionObj = functionArray[parseInt(userSelectionMsg.content.trim()) - offset]
                optionObj
                    .function(optionObj.args)
                    .then((x: any) => {
                        resolve(x)
                    })
                    .catch((error: any) => {
                        reject(error)
                    })

                // todo add the multiple functionality from below
            } catch (error) {
                handleGetSameUserInputError(error, reject)
            }
        })
    }

    export interface arraySelectOptions {
        justShow?: boolean
        customOffset?: number
        time?: number
        multiple?: boolean
        extraStringOptions?: string[]
        paginationOptions?: arrayToPaginatedArrayOptions
    }
    export interface ArraySelectResponse<T> {
        arrayElement?: T
        arrayElements?: T[]
        stringCommand?: string
    }
    export async function arraySelect<T>(
        userID: string,
        textChannel: TextBasedChannels,
        array: Array<T>,
        mapFunction: (t: any, i?: any) => string,
        title: string,
        options?: arraySelectOptions
    ): Promise<ArraySelectResponse<T>> {
        const time = options?.time ? options.time : 15 * NumberConstants.mins
        const offset = options?.customOffset ? options.customOffset : 1
        const multiple = options?.multiple ? options.multiple : false
        const justShow = options?.justShow ? options.justShow : false

        return new Promise(async (resolve, reject) => {
            try {
                const arraySelectResponse: ArraySelectResponse<T> = {}
                const embeds = arrayToPaginatedArray(array, title, mapFunction, options?.paginationOptions)
                const userSelectionMsg = await getSameUserInput(
                    userID,
                    textChannel,
                    { embeds: [embeds[0]] },
                    Filter.numberRangeFilter(offset, array.length, {
                        multipleInputAllowed: multiple,
                    }),
                    {
                        time: time,
                        extraStringOptions: options?.extraStringOptions,
                        pagination: true,
                        paginationEmbeds: embeds,
                    }
                )

                if (multiple) {
                    const elementNumbers: number[] = userSelectionMsg.content
                        .trim()
                        .split(spaceCommaRegex)
                        .map((x) => parseInt(x) - offset)
                    const arrayElements = elementNumbers.map((el) => array[el])
                    arraySelectResponse.arrayElements = arrayElements
                } else {
                    arraySelectResponse.arrayElement = array[parseInt(userSelectionMsg.content.trim()) - offset]
                }

                if (!arraySelectResponse.arrayElement && !arraySelectResponse.arrayElements) {
                    // must be string command
                    if (options?.extraStringOptions) {
                        const stringOption = options.extraStringOptions.find(
                            (x) => userSelectionMsg.content.trim() == x
                        )
                        if (!stringOption) {
                            throw { reason: 'Array select nothing selected', throwError: false }
                        }

                        arraySelectResponse.stringCommand = stringOption
                    } else {
                        throw { reason: 'Array select nothing selected', throwError: false }
                    }
                }

                resolve(arraySelectResponse)
            } catch (error) {
                handleGetSameUserInputError(error, reject)
            }
        })
    }

    export async function setPaginationReaction(message: Message, pages: MessageEmbed[], authorID: string) {
        let page = 0
        const emojiList = ['⏪', '⏩']
        message.edit({ embeds: [pages[page].setFooter(`Page ${page + 1} / ${pages.length}`)] })
        for (const emoji of emojiList) message.react(emoji)
        const reactionCollector = message.createReactionCollector({
            filter: (reaction, user) => emojiList.includes(reaction.emoji.name!) && !user.bot,
            time: 5 * NumberConstants.mins,
        })
        reactionCollector.on('collect', (reaction) => {
            reaction.users.remove(authorID)
            switch (reaction.emoji.name) {
                case emojiList[0]:
                    page = page > 0 ? --page : pages.length - 1
                    break
                case emojiList[1]:
                    page = page + 1 < pages.length ? ++page : 0
                    break
                default:
                    break
            }
            message.edit({ embeds: [pages[page].setFooter(`Page ${page + 1} / ${pages.length}`)] })
        })
        reactionCollector.on('end', () => {
            if (!message.deleted) {
                message.reactions.removeAll()
            }
        })
    }

    export interface arrayToPaginatedArrayOptions {
        numbered?: boolean
        pageSize?: number
        offset?: number
        chunk?: number
    }
    export function arrayToPaginatedArray(
        arr: any[],
        title: string,
        mapFunction: (t: any) => string,
        options?: arrayToPaginatedArrayOptions
    ): MessageEmbed[] {
        const embeds: MessageEmbed[] = []
        const offset = options?.offset || 1
        const chunk = options?.chunk || 15
        const maxLength = 1000

        let i: number, j: number
        for (i = 0, j = arr.length; i < j; i += chunk) {
            const fields: EmbedFieldData[] = []
            let f: string[] = []
            let curLength = 0
            const linkChunk = arr.slice(i, i + chunk)
            linkChunk.forEach((x, k) => {
                const entry = `${options && !options.numbered ? '' : '**' + (i + k + offset) + '**. '}${mapFunction(x)}`
                const isUnder = curLength + entry.length < maxLength
                if (isUnder) {
                    f.push(entry)
                    curLength += entry.length
                }
                if (!isUnder) {
                    fields.push({
                        name: title,
                        value: f.join('\n'),
                        inline: true,
                    })
                    f = []
                    f.push(entry)
                    curLength = 0
                }

                if (k == linkChunk.length - 1) {
                    fields.push({
                        name: title,
                        value: f.join('\n'),
                        inline: true,
                    })
                }
            })

            const message = new MessageEmbed().addFields(fields)
            embeds.push(message)
        }
        return embeds
    }
}
