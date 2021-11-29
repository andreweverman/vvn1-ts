import { Mongo } from '../testUtil'
import dotenv from 'dotenv'
import { Guild } from '../../db/controllers/guildController'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Mocks } from '../testUtil'
import { AnyCollectorFilter, Filter, Prompt } from '../messageUtil'
import { mocked } from 'ts-jest/utils'
import { TextChannel } from 'discord.js'
import { timeInPast } from '../timeUtil'
import { dateRegex, timeRegex } from '../stringUtil'

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

describe('timeRegex', () => {
    describe('when it matches', () => {
        describe.each([
            ['10:30', ['10:30', '10', '30', undefined]],
            ['11:04', ['11:04', '11', '04', undefined]],
            ['1:58', ['1:58', '1', '58', undefined]],
            ['0:44', ['0:44', '0', '44', undefined]],
            ['12:30AM', ['12:30AM', '12', '30', 'AM']],
            ['2:34 PM', ['2:34 PM', '2', '34', 'PM']],
        ])('%p is valid time', (input, expectedMatch) => {
            it(`${input} should be valid `, () => {
                expect(timeRegex.test(input)).toBe(true)
            })
            it('should match what we think it should', () => {
                const exec = timeRegex.exec(input)
                if (exec == undefined) throw new Error('Regex should match in this test')
                for (let i = 0; i < exec.length; i++) {
                    expect(exec[i]).toEqual(expectedMatch[i])
                }
            })
        })
    })

    describe('when it doesnt match', () => {
        it.each([['10:301'], ['111:30'], ['flip off'], ['-1:30']])('%p is not a valid time', (input) => {
            expect(timeRegex.test(input)).toBe(false)
        })
    })
})

describe('dateRegex', () => {
    describe.each([['12/25/2020'], ['07/12/1998'], ['7/2/1998']])('%p is a valid date', (input) => {
        it(`${input} is a valid date`, () => {
            expect(dateRegex.test(input)).toBe(true)
        })
    })

    describe('when it doesnt match', () => {
        it.each([['1998/12/2'], ['02/901/1992'], ['flip off'], ['-1/12/1998']])('%p is not a valid time', (input) => {
            expect(dateRegex.test(input)).toBe(false)
        })
    })
})



    
