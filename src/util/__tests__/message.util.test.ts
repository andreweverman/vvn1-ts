import { Mongo } from '../test.util'
import dotenv from 'dotenv'
import { Guild } from '../../db/controllers/guild.controller'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Mocks } from '../test.util'
import { AnyCollectorFilter, Filter, Prompt } from '../message.util'
import { mocked } from 'ts-jest/utils'
import { MessageChannel } from '../message.util'
import { TextChannel } from 'discord.js'

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

describe('Filter', () => {
    describe('multipleFilters', () => {
        const returnTrue: AnyCollectorFilter = async (z: any) => true
        const returnFalse: AnyCollectorFilter = (z: any) => false

        describe('when required is nonempty, one is empty', () => {
            describe('return true when', () => {
                it('one true in req', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })

                it(' two true filters in req', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue, returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })
            })

            describe('return false when', () => {
                it('one false in req', () => {
                    const func = Filter.multipleFilters({
                        every: [returnFalse],
                    })
                    expect(func()).resolves.toBe(false)
                })

                it('two false in req', () => {
                    const func = Filter.multipleFilters({
                        every: [returnFalse, returnFalse],
                    })
                    expect(func()).resolves.toBe(false)
                })
                it('one false, one true in req ', () => {
                    const func = Filter.multipleFilters({
                        every: [returnFalse, returnTrue],
                    })
                    expect(func()).resolves.toBe(false)
                })
            })
        })

        describe('when required is empty, one is nonempty', () => {
            describe('return true when', () => {
                it('one true', () => {
                    const func = Filter.multipleFilters({ some: [returnTrue] })
                    expect(func()).resolves.toBe(true)
                })

                it('two true', () => {
                    const func = Filter.multipleFilters({
                        some: [returnTrue, returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })

                it('one false, one true', () => {
                    const func = Filter.multipleFilters({
                        some: [returnFalse, returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })
            })

            describe('return false when', () => {
                it('one false in req', () => {
                    const func = Filter.multipleFilters({
                        some: [returnFalse],
                    })
                    expect(func()).resolves.toBe(false)
                })

                it('two false in req', () => {
                    const func = Filter.multipleFilters({
                        some: [returnFalse, returnFalse],
                    })
                    expect(func()).resolves.toBe(false)
                })
            })
        })

        describe('when both are nonempty', () => {
            describe('when true', () => {
                it('is true when req is true and one has a true', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue],
                        some: [returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })

                it('is true when req is true and one has a false', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue],
                        some: [returnTrue, returnFalse],
                    })
                    expect(func()).resolves.toBe(true)
                })

                it('is true when req has two true and one true', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue, returnTrue],
                        some: [returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })
                it('is true when req has two true and two true', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue, returnTrue],
                        some: [returnTrue, returnTrue],
                    })
                    expect(func()).resolves.toBe(true)
                })
            })

            describe('when false', () => {
                it('req is false and one has true', () => {
                    const func = Filter.multipleFilters({
                        every: [returnFalse],
                        some: [returnTrue],
                    })
                    expect(func()).resolves.toBe(false)
                })

                it('req is false and one is false', () => {
                    const func = Filter.multipleFilters({
                        every: [returnFalse],
                        some: [returnFalse],
                    })
                    expect(func()).resolves.toBe(false)
                })

                it('req is true and one is false', () => {
                    const func = Filter.multipleFilters({
                        every: [returnTrue],
                        some: [returnFalse],
                    })
                    expect(func()).resolves.toBe(false)
                })
            })
        })

        it('when both are empty', () => {
            const func = Filter.multipleFilters({ every: [], some: [] })
            expect(func()).resolves.toBe(true)
        })
    })

    describe('stringFilter', () => {
        const falseTrue: boolean[] = [false, true]
        describe('loose', () => {
            it.each([
                ['vote', 'vote', true, true],
                ['vote', 'vote for me', false, true],
                ['vote', 'votez for me', false, true],
                ['voter', 'vote', false, false],
                ['voter', 'votes', false, false],
            ])('%p, %p, %p, %p', (regexString, input, off, on) => {
                falseTrue.forEach((enabled) => {
                    const expected = !enabled ? off : on
                    const message = Mocks.mockMessage(input, '12345', 'text')
                    const res = Filter.stringFilter(regexString, {
                        loose: enabled,
                    })(message)
                    expect(expected).toBe(res)
                })
            })
        })

        describe('insensitive', () => {
            it.each([
                ['vote', 'vote', true, true],
                ['vote', 'vOte', false, true],
                ['vote', 'voTe', false, true],
                ['vote', 'votE', false, true],
            ])('%p, %p, %p, %p', (regexString, input, off, on) => {
                falseTrue.forEach((enabled) => {
                    const expected = !enabled ? off : on
                    const message = Mocks.mockMessage(input, '12345', 'text')
                    const res = Filter.stringFilter(regexString, {
                        insensitive: enabled,
                        loose: true,
                    })(message)
                    expect(expected).toBe(res)
                })
            })
        })

        describe('trimRegex', () => {
            it.each([
                ['vote', 'vote', true, true],
                ['vote ', 'vote', false, true],
                [' vote', 'vote', false, true],
                [' vote ', 'vote', false, true],
                [' vote ', 'fungus', false, false],
            ])('%p, %p, %p, %p', (regexString, input, off, on) => {
                falseTrue.forEach((enabled) => {
                    const expected = !enabled ? off : on
                    const message = Mocks.mockMessage(input, '12345', 'text')
                    const res = Filter.stringFilter(regexString, {
                        trimRegex: enabled,
                        loose: true,
                    })(message)
                    expect(expected).toBe(res)
                })
            })
        })

        describe('trimInput', () => {
            //wtf tho
            it.each([
                ['vote', 'vote', true, true],
                ['vote', 'vote ', false, true],
                ['vote', ' vote ', false, true],
                ['vote', ' vote ', false, true],
                ['vote', 'fungus', false, false],
            ])('%p, %p, %p, %p', (regexString, input, off, on) => {
                falseTrue.forEach((enabled) => {
                    const expected = !enabled ? off : on
                    const message = Mocks.mockMessage(input, '12345', 'text')
                    const res = Filter.stringFilter(regexString, {
                        trimInput: enabled,
                        loose: false,
                    })(message)
                    expect(expected).toBe(res)
                })
            })
        })
    })

    describe('Message Atomics', () => {})
})

describe('Prompt', () => {
    describe('getSameUserInput', () => {
        const userID = '1234567890'

        describe('when it returns a response', () => {
            /*
            First one is simplest
            second one is using a filter 
            third one shows filter not accepting first, accepting second and not accepting third beacuse exits
            */

            it.each([
                [['message'], 0, Filter.anyFilter()],
                [['0'], 0, Filter.numberRangeFilter(0, 5)],
                [['-1', '2', '3'], 1, Filter.numberRangeFilter(0, 5)],
            ])(
                'content: %p, expected array element %p, filter %p',
                async (messageContent: string[], desiredMessageIndex: number, filter: AnyCollectorFilter) => {
                    const messages = messageContent.map((x) => Mocks.mockMessage(x, userID, 'text'))

                    const textChannel = mocked((Mocks.textChannel(messages, 'text') as unknown) as MessageChannel)
                    // const mc = TextChannel as jest.Mock<MessageChannel>
                    const res = await Prompt.getSameUserInput(userID, textChannel, 'Prompt', filter)

                    expect(res.content).toEqual(messageContent[desiredMessageIndex])
                    expect(res.author.id).toEqual(userID)
                }
            )
        })
    })
})
