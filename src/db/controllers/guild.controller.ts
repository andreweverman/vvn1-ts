import Guild, { IGuild } from "../models/guild.model";
import { CreateQuery } from "mongoose";
import { findOrCreateResponse } from "../db.interfaces";
import { Resolver } from "dns";
import { create } from "domain";

async function InitializeGuild({
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
          });
        } else {
          //   need to make it
          Guild.create({ guild_id: guild_id })
            .then((createData: IGuild) => {
              resolve({
                created: true,
                message: "This user has been created",
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
