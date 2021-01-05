import { CollectorFilter } from 'discord.js'
import { escapeRegExp } from 'lodash'
import moment, { Moment } from 'moment-timezone'
import { Filter, AnyCollectorFilter, Prompt as MPrompt, MessageChannel } from './message.util'
import { timeRegex, dateRegex } from './string.util'

export function dateInPast(timeZoneName: string, dateString: string, compareDate?: Moment) {
    const parsedDate = parseDate(dateString)
    if (parsedDate == undefined) return undefined
    const date = moment(parseDate(dateString), timeZoneName)
    // need to set the time to the absolute latest in that day so that all times in that day are before it
    date.hour(0)
    date.minute(0)
    date.second(0)
    let dateToCompare = compareDate ? compareDate : moment(new Date()).tz(timeZoneName)

    console.log(date.toString())
    console.log(dateToCompare.toString())

    return date.isBefore(dateToCompare)
}

export interface TimeInPastOptions {
    date?: string | Date
    interpolate?: boolean
    compareDate?: Moment
}

export function timeInPast(timeZoneName: string, timeString: string, options?: TimeInPastOptions): boolean | undefined {
    const interpolate = options?.interpolate != false ? true : false
    let dateObj: Moment = moment()
    dateObj.tz(timeZoneName)

    const time = parseTime(timeZoneName, timeString, interpolate)
    if (!time) return undefined
    if (options?.date) {
        // looking for the date only here.
        dateObj = moment.tz(options.date, timeZoneName)
        if (!dateObj.isValid()) return undefined
    }
    dateObj.hour(time.hour)
    dateObj.minute(time.minute)
    dateObj.second(0)

    const compareDate = options?.compareDate ? options.compareDate : moment()

    console.log(dateObj.toString())
    console.log(compareDate.toString())
    return dateObj.isBefore(compareDate)
}

export function beforeMinMoment(timeZoneName: string, minMoment: Moment, dateString: string): boolean {
    const date = parseDate(dateString)
    if (!date) return false

    const dateMoment = moment(date, timeZoneName)
    dateMoment.hour(23)
    dateMoment.minute(59)

    return dateMoment.isBefore(minMoment)
}

export interface ParseTimeResponse {
    hour: number
    minute: number
}
export function parseTime(timeZoneName: string, timeString: string, interpolate = true): ParseTimeResponse | undefined {
    // time is guaranteed to be good for this

    const time = timeRegex.exec(timeString)
    if (time == null) {
        return undefined
    }
    const newTime = { hour: parseInt(time[1]), minute: parseInt(time[2]) }
    // shifting for PM
    let ampm = 'AM'

    if (interpolate) {
        const timeObj = moment()
        timeObj.tz(timeZoneName)
        if (timeObj.hours() > newTime.hour) ampm = 'PM'
    }
    // ex. if user puts in 7 and already past 7am, then defaults to pm.

    // AM/PM modifiers
    if (time[3]) {
        ampm = time[3].toUpperCase()
    }
    if (ampm == 'PM') {
        if (newTime.hour != 12) newTime.hour += 12
    }
    if (ampm == 'AM') {
        if (newTime.hour == 12) newTime.hour = 0
    }

    return newTime
}

export function parseDate(dateString: string): Date | undefined {
    if (!dateRegex.test(dateString)) return undefined
    return new Date(dateString)
}

export namespace Prompt {
    export interface PromptDateResponse {
        date: Date
        dateString: string
    }
    export interface PromptDateOptions {
        prePrompt?: string
        pastAllowed?: boolean
    }
    export async function promptDate(
        userID: string,
        textChanel: MessageChannel,
        timeZoneName: string,
        options?: PromptDateOptions
    ): Promise<PromptDateResponse> {
        const prePrompt = options ? options.prePrompt + '\n' : ''
        const fullPrompt = prePrompt + 'Enter date in mm/dd/yyyy | mm.dd.yyyy | mm-dd-yyyy format:'
        const pastAllowed = options?.pastAllowed ? true : false

        const everyFilters: AnyCollectorFilter[] = []
        everyFilters.push(Filter.regexFilter(dateRegex))

        if (!options?.pastAllowed) everyFilters.push(Filter.dateNotInPastFilter(timeZoneName))

        const filter = Filter.multipleFilters({
            every: everyFilters,
        })

        const m = await MPrompt.getSameUserInput(userID, textChanel, fullPrompt, filter)

        const dateString = m.content.trim()

        return { dateString: dateString, date: new Date(dateString) }
    }

    export interface PromptTimeOptions extends PromptDateOptions {
        date?: Date
        interpolate?: boolean
    }

    export async function promptTime(
        userID: string,
        textChannel: MessageChannel,
        timeZoneName: string,
        options?: PromptTimeOptions
    ) {
        try {
            const pastAllowed = options?.pastAllowed ? true : false
            const prompt = options?.prePrompt + '\nEnter a time in HH:MM AM/PM format (Ex. 11:30 PM)'

            const filter = pastAllowed
                ? Filter.regexFilter(timeRegex)
                : Filter.multipleFilters({
                      every: [
                          Filter.regexFilter(timeRegex),
                          Filter.notInPastFilter(timeZoneName, { date: options?.date }),
                      ],
                  })

            const m = await MPrompt.getSameUserInput(userID, textChannel, prompt, filter)

            const timeString = m.content.trim()

            return parseTime(timeZoneName, timeString, options?.interpolate)
        } catch (error) {
            MPrompt.handleGetSameUserInputError(error)
        }
    }
}
