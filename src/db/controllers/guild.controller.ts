import Guild, { IGuild, IAlias, IGuildDoc } from "../models/guild.model";
import {
  CreateQuery,
  MongooseUpdateQuery,
  QueryUpdateOptions,
  UpdateQuery,
} from "mongoose";
import { findOrCreateResponse, updateOneResponse } from "../db.interfaces";

export interface IAliasNoName {
  id: string,
  type: string
}

export async function initializeGuild({
  guild_id,
}: CreateQuery<IGuildDoc>): Promise<findOrCreateResponse> {
  // making my own findorcreate here as
  // there is no good type definition

  return new Promise((resolve, reject) => {
    Guild.findOne({ guild_id: guild_id })
      .then((data: IGuildDoc | null) => {
        if (data) {
          resolve({
            created: false,
            message: "Already exists",
            doc: data,
          });
        } else {
          //   need to make it
          Guild.create({ guild_id: guild_id })
            .then((createData: IGuildDoc) => {
              resolve({
                created: true,
                message: `${guild_id} has been created.`,
                doc: createData,
              });
            })
            .catch((error: Error) => {
              reject(error);
            });
        }
      })
      .catch((error: Error) => {
        reject(error);
      });
  });
}

export async function createAlias(
  { guild_id }: IGuild,
  { id, type }: IAliasNoName,
  names: string[]
): Promise<updateOneResponse> {
  const updateResponse = `Alias for ${id} has been created`;
  const noUpdateResponse = `Alias for ${id} has not been created`;

  const alias_objs = names.map((new_name) => {
    const z: UpdateQuery<IAlias> = { name: new_name, id: id, type: type };

    return z;
  });

  return new Promise(async (resolve, reject) => {
    if (alias_objs.length == 0) {
      reject("Bad");
      return;
    }

    const guild = await Guild.findOne({ guild_id: guild_id });

    if (!guild) { reject('No') }

    const query: MongooseUpdateQuery<IGuildDoc> = {
      //@ts-ignore
      $push: {
        aliases: alias_objs
      }
    };

    resolve(Guild.updateOne({ guild_id: guild_id },
      query));


  });
}
