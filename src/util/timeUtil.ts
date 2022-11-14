/**
 *
 * Utility for functions pertain to time zones
 *
 * Contains functions for dealing with time and all its issues
 *
 * @file   Utility for time and time zones
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import moment, { Moment } from 'moment-timezone'
import { timeRegex, dateRegex } from './stringUtil'

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

export function getTimeStrFromSeconds(inputSeconds: number): string {
    const days = Math.floor(inputSeconds / (3600 * 24))
    const hours = Math.floor((inputSeconds % (3600 * 24)) / 3600)
    const minutes = Math.floor((inputSeconds % 3600) / 60)
    const seconds = Math.floor(inputSeconds % 60)
    const stringArr: string[] = []

    if (days > 0) stringArr.push(`${days} Day${days > 1 ? 's' : ''}`)
    if (hours > 0) stringArr.push(`${hours} Hour${hours > 1 ? 's' : ''}`)
    if (minutes > 0) stringArr.push(`${minutes} Minute${minutes > 1 ? 's' : ''}`)
    if (seconds > 0) stringArr.push(`${seconds} Second${seconds > 1 ? 's' : ''}`)

    return stringArr.join(', ')
}

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
