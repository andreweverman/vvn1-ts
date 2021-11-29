import { Mongo } from '../testUtil'
import dotenv from 'dotenv'
import { Guild } from '../../db/controllers/guildController'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Mocks } from '../testUtil'
import { AnyCollectorFilter, Filter, Prompt } from '../messageUtil'
import { mocked } from 'ts-jest/utils'
import { TextChannel } from 'discord.js'
import { dateInPast, parseDate, timeInPast, getTimeStrFromSeconds } from '../timeUtil'
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


describe('dateInPast', () => {
    const tz = 'America/New_York'
    describe('date is not in past', () => {
        it.each([['1/1/2020'], ['01/1/2020']])('double(%p)', (input) => {
            const inPast = dateInPast(tz, input, moment(new Date('1/1/2021')))
            expect(inPast).toBe(false)
        })
    })

    describe('date is in the past', () => {
        it.each([['1/1/2021'], ['01/1/2021']])('double(%p)', (input) => {
            const inPast = dateInPast(tz, input, moment(new Date('1/1/2021')))
            expect(inPast).toBe(false)
        })
    })
})

describe('timeInPast', () => {
    
})


describe('getTimeStrFromSeconds', () => {
    it.each([
        [33, '33 Seconds'],
        [61, '1 Minute, 1 Second'],
        [92, '1 Minute, 32 Seconds'],
        [123456, '1 Day, 10 Hours, 17 Minutes, 36 Seconds'],
    ])('getTimeStrFromSeconds(%d)', (input, expected) => {
        const ret = getTimeStrFromSeconds(input)
        expect(ret).toBe(expected)
    })
})
