import { Mongo } from '../test.util'
import dotenv from 'dotenv'
import { Guild } from '../../db/controllers/guild.controller'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Mocks } from '../test.util'
import { AnyCollectorFilter, Filter, Prompt } from '../message.util'
import { mocked } from 'ts-jest/utils'
import { MessageChannel } from '../message.util'
import { TextChannel } from 'discord.js'
import { MovieUtil } from '../general.util'
import axios from 'axios'
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

describe('MovieUtil', () => {
    describe('getInfoPage', () => {
        describe('when a good name is input', () => {
            it(`should get a known movie with full name`, async () => {
                const res = await MovieUtil.getInfoPage('Seven Samurai')
                expect(res).toEqual('https://letterboxd.com/film/seven-samurai/')
            })

            it('should get a lesser known movie with full name', async () => {
                const res = await MovieUtil.getInfoPage('Bubble boy')
                expect(res).toEqual('https://letterboxd.com/film/bubble-boy/')
            })

            it('should get a movie from a substring', async () => {
                const res = await MovieUtil.getInfoPage('2001 space')
                expect(res).toEqual('https://letterboxd.com/film/2001-a-space-odyssey/')
            })

            it('should get a movie that is under a user first in results', async () => {
                const res = await MovieUtil.getInfoPage('Goldmember')
                expect(res).toEqual('https://letterboxd.com/film/austin-powers-in-goldmember/')
            })
        })

        describe('when it errors', () => {
            it('should return null', async () => {
                // making axios error out
                axios.get = jest.fn().mockRejectedValue(new Error('Axios error'))

                const res = await MovieUtil.getInfoPage('Jimmy Neutron')
                expect(res).toEqual(null)
            })
        })
    })
})
