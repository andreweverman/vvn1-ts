import { Document } from "mongoose";
import { sendToChannel, MessageChannel } from "../util/message.util";
import { keywords } from "../util/constants"
import _ from "lodash";
export interface findOrCreateResponse {
  created: boolean;
  message: string;
  doc?: Document;
}

export interface updateOneResponse {
  n: number;
  nModified: number;
  ok: number;
}
export interface updateOneStrings {
  success: string,
  failure: string
}
export interface updateOneResponseHandlerResponse {
  updated: boolean,
  messageSent: boolean;
}

function responsesEqual(response: updateOneResponse, expected: updateOneResponse): boolean {
  const properties = ['n', 'nModified', 'ok'];
  let ret = true;
  properties.forEach(prop => {
    //@ts-ignore
    if (!(response[prop] === expected[prop])) { ret = false; }
  })
  return ret;
}

export function updateOneResponseHandler(response: updateOneResponse, strings: updateOneStrings, textChannel?: MessageChannel, expectedResponseInput?: updateOneResponse): Promise<updateOneResponseHandlerResponse> {

  return new Promise<updateOneResponseHandlerResponse>((resolve, reject) => {

    const resolveResponse: updateOneResponseHandlerResponse = { updated: false, messageSent: false };
    const expectedResponse: updateOneResponse = expectedResponseInput ? expectedResponseInput : { n: 1, nModified: 1, ok: 1 }

    if (responsesEqual(response, expectedResponse)) {
      resolveResponse.updated = true;
      // matches expectations, send success
      if (textChannel) {
        sendToChannel(textChannel, strings.success).then(x => {
          resolveResponse.messageSent = true;
          resolve(resolveResponse);
        }).catch(() => {
          resolveResponse.messageSent = false;
          resolve(resolveResponse);
        });
      } else {
        resolve(resolveResponse);
      }
    }
    else {
      if (textChannel) {
        sendToChannel(textChannel, strings.failure).then(() => {
          resolveResponse.messageSent = true;
          resolve(resolveResponse)
        }).catch(() => {
          resolveResponse.messageSent = false;
          resolve(resolveResponse)
        })
      } else {
        resolve(resolveResponse)
      }
    }


  })
}


export function uniqueArrayObject(array: any[], newElementIds: any[], uniqueMatcher?: string) {

  const filter = (newID: string) => {
    return !array.find(arrayElement => uniqueMatcher ? arrayElement[uniqueMatcher] : arrayElement == newID) &&
      !keywords.find(x => x == newID)
  }

  let [approved, rejected] = _.partition(newElementIds, filter);

  // ensures no duplicates in the approved aliases
  approved = approved.filter((v, i, s) => s.indexOf(v) === i);

  return { approved: approved, rejected: rejected }
}

