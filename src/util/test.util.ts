import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server'
import events from 'events';
import { mocked } from 'ts-jest/utils'
import { Message, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export namespace Mongo {

    export async function mongoConnect() {
        try {

            const mongod = new MongoMemoryServer();
            const uri = await mongod.getUri();

            const mongooseOpts = {
                useCreateIndex: true,
                useNewUrlParser: true,
                useUnifiedTopology: true
            };
            await mongoose.connect(uri, mongooseOpts);
            return mongod
        } catch (error) {
            throw error
        }
    }

    export async function mongoDisconnect(mongod: MongoMemoryServer) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongod.stop();
    }
}

export namespace Mocks {

    export interface MessageMinimum {
        content: string,
        author: { id: string },
    }


    class Collector {
        arr: MessageMinimum[];

        constructor() {
            this.arr = []
        }

        last() {
            return this.arr[this.arr.length - 1]
        }

        push(val: MessageMinimum) {
            this.arr.push(val)
        }
    }

    class TCEventEmitter extends events.EventEmitter {
        collected: Collector;

        constructor() {
            super();
            this.collected = new Collector()
        }

        stop(str: string) {
            this.emit('end', this.collected, str)
        }
    }

    export function mockMessage(content: string | MessageEmbed, authorID: string, channelType: string): Message {
        const msg = { content: content, author: { id: authorID }, delete: async () => true, channel: { type: channelType } }
        const mockedMsg = mocked(msg as unknown as Message)
        return mockedMsg
    }

    export function textChannel(messages: MessageMinimum[], channelType = 'text', timeout = false) {

        if (!process.env.botUserID) { throw new Error('botUserID needs to be set in .env'); }
        return {
            type: channelType,
            send: async (content: string | MessageEmbed) => mockMessage(content, process.env.botUserID!, channelType),
            createMessageCollector: jest.fn().mockImplementationOnce((filter, _) => {
                const self = new TCEventEmitter();

                if (timeout) {
                    setTimeout(() => {
                        self.stop('time')
                    }, 20)
                }
                setTimeout(() => {
                    for (let i = 0; i < messages.length; i++) {
                        const msg = messages[i];
                        if (filter(msg)) {
                            self.collected.push(msg);
                            self.emit('collect', msg)
                        }
                    }
                }, 10);

                return self;
            })
        }
    }

    export function getSameUserInput(content: string, und = false) {

        const gsuiMock = jest.fn();
        und ?
            gsuiMock.mockRejectedValueOnce(undefined) :
            gsuiMock.mockReturnValueOnce({ content: content })

        return gsuiMock
    }
}