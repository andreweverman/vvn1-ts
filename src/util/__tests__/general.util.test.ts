import { Mongo } from '../testUtil'
import dotenv from 'dotenv'
import { Alias, Guild } from '../../db/controllers/guildController'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Mocks } from '../testUtil'
import { AnyCollectorFilter, Filter, Prompt } from '../messageUtil'
import { mocked } from 'ts-jest/utils'
import { TextChannel, Guild as GuildD } from 'discord.js'
import { MovieUtil, AliasUtil } from '../generalUtil'
import puppeteer from 'puppeteer'
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

describe('AliasUtil', () => {
    describe('parseChannelsAndMembers', () => {
        const users = [
            { id: '12345', names: ['andrew'], nickname: 'gardenweasel' },
            { id: '9841', names: ['zach'], nickname: 'leon' },
            { id: '4466', names: ['mike', 'michael'], nickname: 'lildogmike' },
        ]
        const voiceChannels = [
            { id: '12988', names: ['main'], nickname: 'Main Channel' },
            { id: '90523', names: ['loud'], nickname: 'Main Is Loud' },
            { id: '88543', names: ['move', 'game'], nickname: 'Move If Game' },
        ]
        beforeEach(async () => {
            for (let i = 0; i < users.length; i++) {
                let x = users[i]
                await Alias.createAlias(guildID, { id: x.id, type: Alias.Types.user }, x.names)
            }
        })

        function guildGenerator() {
            let guild = {
                member: jest.fn(),
                members: {
                    fetch: jest.fn((x) => users.find((y) => y.id == x)),
                },
                channels: {
                    resolve: jest.fn(),
                },
                id: guildID,
            } as unknown
            return guild
        }
        it('when it doesnt find anything', () => {
            let guildD = guildGenerator() as GuildD
            const res = AliasUtil.parseChannelsAndMembers(guildD, ['chucky'])
            res.then((x) => {
                expect(x.members.length).toBe(0)
                expect(x.moveChannel).not.toBeTruthy()
                expect(x.textChannels.length).toBe(0)
                expect(x.voiceChannels.length).toBe(0)
            })
        })

        describe('when it finds users', () => {
            it('should find andrew', async () => {
                let guildD = guildGenerator() as GuildD
                const res = AliasUtil.parseChannelsAndMembers(guildD, ['andrew'])
                res.then((x) => {
                    expect(x.members.length).toBe(1)

                    expect(x.members[0].nickname).toBe('gardenweasel')
                    expect(x.members[0].id).toBe('12345')
                    expect(x.moveChannel).not.toBeTruthy()
                    expect(x.textChannels.length).toBe(0)
                    expect(x.voiceChannels.length).toBe(0)
                })
            })
            it('should find zach', async () => {
                let guildD = guildGenerator() as GuildD
                const res = AliasUtil.parseChannelsAndMembers(guildD, ['zach'])
                res.then((x) => {
                    expect(x.members.length).toBe(1)

                    expect(x.members[0].nickname).toBe('leon')
                    expect(x.members[0].id).toBe('9841')
                    expect(x.moveChannel).not.toBeTruthy()
                    expect(x.textChannels.length).toBe(0)
                    expect(x.voiceChannels.length).toBe(0)
                })
            })

            it('should find andrew, zach, and mik', async () => {
                let guildD = guildGenerator() as GuildD
                const res = AliasUtil.parseChannelsAndMembers(guildD, ['andrew', 'zach', 'mike'])
                res.then((x) => {
                    expect(x.members.length).toBe(3)

                    users.forEach((y, i) => {
                        expect(x.members[i].nickname).toBe(y.nickname)
                        expect(x.members[i].id).toBe(y.id)
                    })
                    expect(x.moveChannel).not.toBeTruthy()
                    expect(x.textChannels.length).toBe(0)
                    expect(x.voiceChannels.length).toBe(0)
                })
            })
        })

        describe('when it finds voice channels', () => {})
    })
})

describe('MovieUtil', () => {
    describe('getInfoPage', () => {
        describe('when a good name is input', () => {
            jest.setTimeout(20000)
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
                puppeteer.launch = jest.fn().mockRejectedValue(new Error('Puppeteer error'))

                const res = await MovieUtil.getInfoPage('Jimmy Neutron')
                expect(res).toEqual(null)
            })
        })
    })
})
