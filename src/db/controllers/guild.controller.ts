import Guild, { IAlias, IGuild } from "../models/guild.model";
import {
  CreateQuery,
  MongooseUpdateQuery,
  QueryUpdateOptions,
  UpdateQuery,
} from "mongoose";
import { findOrCreateResponse, updateOneResponse } from "../db.interfaces";

export async function InitializeGuild({
  guild_id,
}: CreateQuery<IGuild>): Promise<findOrCreateResponse> {
  // making my own findorcreate here as
  // there is no good type definition

  return new Promise((resolve, reject) => {
    Guild.findOne({ guild_id: guild_id })
      .then((data: IGuild | null) => {
        if (data) {
          resolve({
            created: false,
            message: "Already exists",
            doc: data,
          });
        } else {
          //   need to make it
          Guild.create({ guild_id: guild_id })
            .then((createData: IGuild) => {
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

export async function CreateAlias(
  { guild_id }: CreateQuery<IGuild>,
  { id, type }: IAlias,
  names: string[]
): Promise<updateOneResponse> {
  const updateResponse = `Alias for ${id} has been created`;
  const noUpdateResponse = `Alias for ${id} has not been created`;

  interface z {
    name: string;
    id: string;
    type: string;
  }

  const alias_objs = names.map((new_name) => {
    const z: UpdateQuery<z> = { name: new_name, id: "", type: "" };

    return z;
  });

  return new Promise((resolve, reject) => {
    if (alias_objs.length == 0) {
      reject("Bad");
      return;
    }
    Guild.updateOne(
      { guild_id: guild_id },
      {
        $push: {
          aliases: alias_objs,
        },
      }
    );
  });
}
