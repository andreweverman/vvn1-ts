import Guilds, { IGuild, IAlias, IGuildDoc, IConfigDoc, IAliasDoc, ILink } from "../models/guild.model";
import {
  CreateQuery,
  MongooseDocument,
  MongooseUpdateQuery,
  QueryUpdateOptions,
  UpdateQuery,

} from "mongoose";
import { findOrCreateResponse, uniqueArrayObject, updateOneResponse, updateOneResponseHandler, updateOneStrings } from "../db.util";
import _, { reject } from "lodash";
import { keywords, NumberConstants } from '../../util/constants'
import { MessageEmbed } from "discord.js";
import { sendToChannel, MessageChannel } from '../../util/message.util'
import { looseMatch } from '../../util/string.util'

export namespace Guild {

  export async function initializeGuild(
    guildID: string
  ): Promise<findOrCreateResponse> {
    // making my own findorcreate here as
    // there is no good type definition

    return new Promise((resolve, reject) => {
      Guilds.findOne({ guild_id: guildID })
        .then((data: IGuildDoc | null) => {
          if (data) {
            resolve({
              created: false,
              message: "Already exists",
              doc: data,
            });
          } else {
            //   need to make it
            // all the config is set up in the mongoose thing so I don't want to redo it here
            //@ts-ignore
            Guilds.create({ guild_id: guildID })
              .then((createData: IGuildDoc) => {
                resolve({
                  created: true,
                  message: `${guildID} has been created.`,
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

  export function getGuild(guildID: string, trialNumber = 0): Promise<IGuildDoc> {

    return new Promise((resolve, reject) => {
      Guilds.findOne({ guild_id: guildID }).exec().then(guildDoc => {
        if (guildDoc == null) {
          if (trialNumber < 3) {
            initializeGuild(guildID).then(x => {
              resolve(getGuild(guildID, trialNumber + 1))
            }).catch(error => {
              console.error(error);
              reject(error);
              return
            })
          }
        }
        else {
          resolve(guildDoc);
        }

      }).catch(error => {
        console.error(error);
      })

    })

  }

  export async function deleteGuild(guildID: string): Promise<boolean> {

    try {
      await Guilds.deleteOne({ guild_id: guildID })
      return true
    } catch (error) {
      throw error
    }


  }

}

export namespace Config {
  export function getGuildConfig(
    guildID: string
  ): Promise<IConfigDoc> {

    return new Promise(async (resolve, reject) => {

      Guild.getGuild(guildID).then((guildDoc) => {
        guildDoc && guildDoc.config ?
          resolve(guildDoc.config) :
          reject(null);
      }).catch((error) => {
        reject(error);
      })
    })

  }

  export function getGuildPrefix(
    guildID: string
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {

      getGuildConfig(guildID).then((config) => {
        resolve(config.prefix);
      }).catch((err) => {
        reject(err)
      })

    })
  }
}


export namespace Alias {

  export interface IAliasNoName {
    id: string,
    type: string
  }

  export enum Types {
    user = 'user',
    voice = 'voice',
    text = 'text'
  }

  export interface createAliasResponse {
    response: updateOneResponse,
    approvedAliases: string[],
    rejectedAliases: string[],
  }

  export function createAlias(
    guildID: string,
    { id, type }: IAliasNoName,
    names: string[],
    textChannel?: MessageChannel
  ): Promise<createAliasResponse> {
    return new Promise((resolve, reject) => {

      let resolveObj: createAliasResponse;
      const strings = { success: `Alias for ${id} has been created`, failure: `Alias for ${id} has not been created` }

      Guild.getGuild(guildID).then((guildDoc) => {

        const aliases = guildDoc.aliases;

        const { approved, rejected } = uniqueArrayObject(aliases, names, 'name');

        if (textChannel) {
          const msg = new MessageEmbed();

          if (approved.length > 0) msg.addField('Approved Aliases', approved.join('\n'), false);
          if (rejected.length > 0) msg.addField('Rejected Aliases', rejected.join('\n'), false);

          sendToChannel(textChannel, msg, true, 30 * NumberConstants.secs);
        }

        if (approved.length == 0) {
          if (textChannel)
            sendToChannel(textChannel, 'No approved aliases. Nothing will be added.', true);

          const z: createAliasResponse = {
            response: { n: 1, nModified: 0, ok: 1 },
            approvedAliases: [],
            rejectedAliases: names
          }
          resolve(z)
          return;
        }

        const alias_objs = approved.map((new_name) => {
          const z: UpdateQuery<IAlias> = { name: new_name, id: id, type: type };
          return z;
        });


        const query: MongooseUpdateQuery<IGuildDoc> = {
          //@ts-ignore
          $push: {
            //@ts-ignore
            aliases: alias_objs
          }
        };

        Guilds.updateOne({ guild_id: guildID }, query).then((x: updateOneResponse) => {
          updateOneResponseHandler(x, strings, textChannel);
          resolveObj = {
            response: x,
            approvedAliases: approved,
            rejectedAliases: rejected,
          }
          resolve(resolveObj);
        })
      }).catch((error) => {
        console.log(error);
        reject(error);
      })


    });
  }

  export function lookupAlias(guildID: string, alias: string): Promise<IAliasDoc | undefined> {
    return new Promise((resolve, reject) => {

      const aliasRegex = looseMatch(alias, { loose: true, trimInput: true, insensitive: true });
      Guild.getGuild(guildID).then(guildDoc => {
        const aliases = guildDoc?.aliases;

        if (aliases.length > 0) {
          resolve(aliases.find(x => aliasRegex.test(x.name)))
        } else {
          resolve(undefined)
        }

      }).catch(error => {
        console.log(error);
        reject(error);
      })

    })

  }

  export function getAliasesByID(guildID: string, id: string): Promise<IAliasDoc[] | undefined> {
    return new Promise((resolve, reject) => {
      Guild.getGuild(guildID).then(guildDoc => {

        const aliases = guildDoc.aliases;

        if (aliases.length > 0) {
          const idAliases = aliases.filter(x => x.id == id);
          if (idAliases.length > 0) {
            resolve(idAliases)
          }
        }
        resolve(undefined)
      }).catch(error => {
        console.log(error);
        reject(error);
      })


    })
  }

  export function deleteAliases(guildID: string, aliases: IAliasDoc | IAliasDoc[], textChannel?: MessageChannel): Promise<updateOneResponse> {

    return new Promise((resolve, reject) => {
      let deleteIDs: any[] = [];
      let deleteNames: string[] = [];
      if (Array.isArray(aliases)) {
        aliases.forEach(x => {
          deleteIDs.push(x._id)
          deleteNames.push(x.name);
        });
      } else {
        deleteIDs.push(aliases._id)
        deleteNames.push(aliases.name);
      }
      const updateStrings: updateOneStrings = {
        success: `The following ids have been deleted: ${deleteNames.join(', ')}`,
        failure: "There was an error deleting the aliases. Please try again or contact the administrator"
      }

      Guilds.updateOne(
        { guild_id: guildID },
        { $pull: { aliases: { _id: { $in: deleteIDs } } } })
        .then((response: updateOneResponse) => {
          updateOneResponseHandler(response, updateStrings, textChannel).then((_) => {
            resolve(response);
          }).catch((error) => {
            reject(error);
          });
        }).catch((error: any) => { reject(error); });

    })

  }
}

export namespace Link {
  export enum LinkTypes {
    clip = "clip",
    link = "link"
  }

  export interface createLinkResponse {
    response: updateOneResponse,
    goodNames: string[],
    rejectedNames: string[]
  }
  export function createLink(guildID: string, linkObj: ILink, textChannel?: MessageChannel) {
    return new Promise((resolve, reject) => {
      Guild.getGuild(guildID).then((guildDoc) => {

        const links = guildDoc.links;
        // need to validate that the names are going to be ok
        const names = linkObj.names;

        // all names for links in this guild
        const allUsedNames: string[] = _.flatten(links.map(link => link.names));

        const { approved, rejected } = uniqueArrayObject(allUsedNames, names);

        if (textChannel) {
          const msg = new MessageEmbed();

          if (approved.length > 0) msg.addField('Approved Names', approved.join('\n'), false);
          if (rejected.length > 0) msg.addField('Rejected Names', rejected.join('\n'), false);

          sendToChannel(textChannel, msg, true, 30 * NumberConstants.secs);
        }
        if (approved.length == 0) {
          if (textChannel)
            sendToChannel(textChannel, 'No approved aliases. Nothing will be added.', true);

          const z: createLinkResponse = {
            response: { n: 1, nModified: 0, ok: 1 },
            goodNames: [],
            rejectedNames: names
          }
          resolve(z)
          return;
        }

        if (linkObj.type == LinkTypes.clip && !linkObj.volume) linkObj.volume = .5
        Guilds.updateOne({ guild_id: guildID }, {
          $push: { linkObj }
        })
      }).catch(
        (error) => reject(error)
      )
    })

  }

  export function viewLinks() {

  }

  export function updateLink() {

  }

  export function deleteLink() {

  }

  export function lookupLink() {

  }

}