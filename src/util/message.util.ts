import { time } from 'console'
import { Message, MessageEmbed, TextChannel, CollectorFilter, DMChannel, NewsChannel, Channel, Guild } from 'discord.js'
import { last } from 'lodash'
import { Moment } from 'moment-timezone'
import { NumberConstants, quit, valid, messageCollectorTimeout, extraStringOption } from './constants'
import { stringMatch, matchOptions, spaceCommaRegex, validUserID } from './string.util'
import { timeInPast, TimeInPastOptions, dateInPast,beforeMinMoment } from './time.util'

export type AsyncCollectorFilter = (...args: any[]) => Promise<boolean>
export type AnyCollectorFilter = AsyncCollectorFilter | CollectorFilter
export type MessageChannel = TextChannel | DMChannel | NewsChannel

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

    export function anyFilter(): CollectorFilter {
        return () => true
    }

    // both are inclusive
    export interface numberRangeFilterOptions {
        integerOnly?: boolean
        multipleInputAllowed?: boolean
    }

    export function numberRangeFilter(min: number, max: number, options?: numberRangeFilterOptions): CollectorFilter {
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

    export function quitFilter(): CollectorFilter {
        return (m: Message) => m.content.trim().toLowerCase() == 'quit'
    }

    export function sameUserFilter(userID: string): CollectorFilter {
        return (m: Message) => m.author.id === userID
    }

    export function uniqueInputFilter(inputs: string[]): CollectorFilter {
        return (response: Message) => !inputs.includes(response.content.trim())
    }

    export function validUserFilter(guild: Guild): CollectorFilter {
        return (response: Message) => {
            return response.content
                .trim()
                .split(' ')
                .some((x) => {
                    const userID = validUserID(x)
                    if (!userID) return false
                    const mem = guild.member(userID)
                    return mem
                })
        }
    }

    export function validChannelFilter(guild: Guild): CollectorFilter {
        return (response: Message) =>
            response.content
                .trim()
                .split(' ')
                .some((x) => guild.channels.resolve(x))
    }

    export function stringFilter(str: string, options: matchOptions): CollectorFilter {
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

    export function stringLengthFilter(maxLength = 0, minLength = 0): CollectorFilter {
        return (response: Message) => {
            const content = response.content.trim()
            return content.length >= minLength && content.length <= maxLength
        }
    }

    export function regexFilter(regex: RegExp, trimInput = true): CollectorFilter {
        return (response: Message) => {
            return regex.test(trimInput ? response.content.trim() : response.content)
        }
    }

    export function notInPastFilter(timeZoneName: string, options?: TimeInPastOptions): CollectorFilter {
        return (response: Message) => {
            const inPast = timeInPast(timeZoneName, response.content.trim(), options)
            return !inPast
        }
    }

    export function dateNotInPastFilter(timeZoneName: string): CollectorFilter {
        return (response: Message) => {
            const inPast = dateInPast(timeZoneName, response.content.trim())
            return !inPast
        }
    }


}

export type DeleteResponse = Message | boolean
export function deleteMessage(message: Message, time: number): Promise<DeleteResponse> {
    return new Promise((resolve, reject) => {
        if (message.channel.type != 'text') resolve(true)

        message
            .delete({ timeout: time })
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
    })
}

export interface sendUtilResponse {
    messages: Message[]
    deleteResponses: Promise<DeleteResponse>[]
}

export function sendUtil(
    message: Promise<Message>,
    autoDelete: boolean,
    autoDeleteTime = 15 * NumberConstants.secs
): Promise<sendUtilResponse> {
    const result: sendUtilResponse = {
        messages: [],
        deleteResponses: [],
    }

    const postSend = (sentMessage: Message) => {
        if (autoDelete) {
            result.messages.push(sentMessage)
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

export function sendToChannel(
    channel: MessageChannel,
    statement: string | MessageEmbed,
    autoDelete = true,
    autoDeleteTime = 15 * NumberConstants.secs
): Promise<sendUtilResponse> {
    return sendUtil(channel.send(statement), autoDelete, autoDeleteTime)
}

export function replyUtil(
    message: Message,
    statement: string | MessageEmbed,
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
    }
    // want to return the message
    //todo make the userID an optional arry
    export async function getSameUserInput(
        userID: string,
        textChannel: MessageChannel,
        messagePrompt: string | MessageEmbed,
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
                    const messageCollector = textChannel.createMessageCollector(Filter.sameUserFilter(userID), {
                        time: time,
                    })

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
        textChannel: MessageChannel,
        filter: AsyncCollectorFilter | CollectorFilter,
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
        textChannel: MessageChannel,
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
        customOffset?: number
        time?: number
        multiple?: boolean
        extraStringOptions?: string[]
    }
    export interface ArraySelectResponse<T> {
        arrayElement?: T
        arrayElements?: T[]
        stringCommand?: string
    }
    export async function arraySelect<T>(
        userID: string,
        textChannel: MessageChannel,
        array: Array<T>,
        message: MessageEmbed | string,
        options?: arraySelectOptions
    ): Promise<ArraySelectResponse<T>> {
        const time = options?.time ? options.time : 15 * NumberConstants.mins
        const offset = options?.customOffset ? options.customOffset : 1
        const multiple = options?.multiple ? true : false

        return new Promise(async (resolve, reject) => {
            try {
                const arraySelectResponse: ArraySelectResponse<T> = {}
                const userSelectionMsg = await getSameUserInput(
                    userID,
                    textChannel,
                    message,
                    Filter.numberRangeFilter(offset, array.length, {
                        multipleInputAllowed: multiple,
                    }),
                    { time: time, extraStringOptions: options?.extraStringOptions }
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
}
