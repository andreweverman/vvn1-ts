import { Mongo } from '../../../util/test.util';
import dotenv from "dotenv";
import { Guild, Alias } from '../../controllers/guild.controller'
import { MongoMemoryServer } from 'mongodb-memory-server'

dotenv.config();

let mongod: MongoMemoryServer;
const guildID = "test";

beforeAll(async () => {
    try { mongod = await Mongo.mongoConnect() } catch (error) { throw error; }
});

beforeEach(async () => {
    try { await Guild.initializeGuild(guildID) } catch (error) { throw error; }
});

afterEach(async () => {
    try { await Guild.deleteGuild(guildID) } catch (error) { throw error }
});

afterAll(async () => {
    Mongo.mongoDisconnect(mongod)
});


describe('alias', () => {

    describe('createAlias', () => {

        describe('when it resolves', () => {

            it('should a single alias to an id', async () => {
                const idInfo = {
                    id: "1234",
                    type: Alias.Types.user
                }
                const names = ["jimbo"];

                try {
                    const res = await Alias.createAlias(guildID, idInfo, names)
                    expect(res.response.n).toBe(1);
                    expect(res.response.nModified).toBe(1);
                    expect(res.response.ok).toBe(1);
                    expect(res.approvedAliases).toEqual(names);

                } catch (error) {
                    throw new Error(error);
                }

            });
        });

    });
});

