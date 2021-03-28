import { CollectorFilter } from 'discord.js'
import { escapeRegExp } from 'lodash'
import moment, { Moment } from 'moment-timezone'
import { Filter, AnyCollectorFilter, Prompt as MPrompt, MessageChannel } from './message.util'
import { timeRegex, dateRegex } from './string.util'

export function dateInPast(timeZoneName: string, dateString: string, compareDate?: Moment) {
    const parsedDate = parseDate(dateString)
    if (parsedDate == undefined) return undefined

    const date = getMomentForTZ(timeZoneName, { date: parsedDate, hour: 23, minute: 59, second: 59 })

    let dateToCompare = compareDate ? compareDate : getCurrentTimeForTZ(timeZoneName)

    return date.isBefore(dateToCompare)
}

export interface TimeInPastOptions {
    date?: Date
    interpolate?: boolean
    compareDate?: Moment
}

export function timeInPast(timeZoneName: string, timeString: string, options?: TimeInPastOptions): boolean | undefined {
    const interpolate = options?.interpolate != false ? true : false
    let dateObj: Moment = getCurrentTimeForTZ(timeZoneName)

    const time = parseTime(timeZoneName, timeString, interpolate)
    if (!time) return undefined
    if (options?.date) {
        // looking for the date only here.
        const parsedDate = options.date
        dateObj = getMomentForTZ(timeZoneName, { date: parsedDate })
        if (!dateObj.isValid()) return undefined
    }
    dateObj.hour(time.hour)
    dateObj.minute(time.minute)
    dateObj.second(0)

    // dateObj.tz(timeZoneName)
    const compareDate = options?.compareDate ? options.compareDate : getCurrentTimeForTZ(timeZoneName)

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

export interface GetMomentForTZOptions {
    date: Date
    hour?: number
    minute?: number
    second?: number
}
export function getMomentForTZ(timeZoneName: string, options: GetMomentForTZOptions): Moment {
    const momentObj = getCurrentTimeForTZ(timeZoneName)
    momentObj.date(options.date.getDate())
    if (options.hour != undefined) momentObj.hour(options.hour)
    if (options.minute != undefined) momentObj.minute(options.minute)
    options.second ? momentObj.second(options.second) : momentObj.second(0)
    return momentObj
}

export function getCurrentTimeForTZ(timeZoneName: string): Moment {
    return moment(new Date(), timeZoneName).tz(timeZoneName)
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

        if (!pastAllowed) everyFilters.push(Filter.dateNotInPastFilter(timeZoneName))

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
