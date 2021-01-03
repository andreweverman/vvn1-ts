import { Mongo } from '../test.util'
import dotenv from 'dotenv'
import { Guild } from '../../db/controllers/guild.controller'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Mocks } from '../test.util'
import { AnyCollectorFilter, Filter, Prompt } from '../message.util'
import { mocked } from 'ts-jest/utils'
import { MessageChannel } from '../message.util'
import { TextChannel } from 'discord.js'
import { dateInPast, parseDate, timeInPast } from '../time.util'
import moment from 'moment-timezone'
dotenv.config()

let mongod: MongoMemoryServer
const guildID = 'test'

beforeAll(async () => {
    try {
        mongod = await Mongo.mongoConnect()
    } catch (error) {
        throw error
    }
})

beforeEach(async () => {
    try {
        await Guild.initializeGuild(guildID)
    } catch (error) {
        throw error
    }
})

afterEach(async () => {
    try {
        await Guild.deleteGuild(guildID)
    } catch (error) {
        throw error
    }
})

afterAll(async () => {
    Mongo.mongoDisconnect(mongod)
})

describe('timeInPast', () => {
    const tz = 'America/New_York'
    describe('when not in past', () => {
        it.each([
            [1, '11:30'],
            [2, '2:30'],
        ])('specify delete. %p days in future, %p as the time', (input, expected) => {
            const specifiedDate = moment()
            specifiedDate.add(input, 'day')
            const dateString = parseDate(specifiedDate.format('L'))
            if (dateString == undefined) throw new Error(' ')

            const past = timeInPast(tz, expected, { date: dateString })
            expect(past).toBe(false)
        })
    })

    describe('when in the past', () => {
        it.each([
            [1, '11:30'],
            [2, '2:30'],
        ])('specify delete. %p days in past, %p as the time', (input, expected) => {
            const specifiedDate = moment().tz(tz)
            specifiedDate.subtract(input, 'day')
            const dateString = specifiedDate.startOf('day').format()
            if (dateString == undefined) throw new Error(' ')
            const past = timeInPast(tz, expected, { date: dateString })
            expect(past).toBe(true)
        })
    })
})

describe('dateInPast', () => {
    const tz = 'America/New_York'
    describe('date is not in past', () => {
        it.each([['1/1/2020'], ['01/1/2020']])('double(%p)', (input) => {
            const inPast = dateInPast(tz, input, moment(new Date('1/1/2021')))
            expect(inPast).toBe(true)
        })
    })

    describe('date is in the past', () => {
        it.each([['1/1/2021'], ['01/1/2021']])('double(%p)', (input) => {
            const inPast = dateInPast(tz, input, moment(new Date('1/1/2021')))
            expect(inPast).toBe(false)
        })
    })
})
