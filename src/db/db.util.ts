/**
 *
 * Some interfaces and general things that will be used across controllers
 * 
 * Mostly for error checking
 * 
 * @file   Mongo db utility 
 * @author Andrew Everman.
 * @since  29.10.2020
 */

import { Document } from 'mongoose'
import { sendToChannel } from '../util/messageUtil'
import { keywords } from '../util/constants'
import _ from 'lodash'
import { TextBasedChannels } from 'discord.js'
export interface findOrCreateResponse {
    created: boolean
    message: string
    doc?: Document
}

export interface updateOneResponse {
    n: number
    nModified: number
    ok: number
}
export interface updateOneStrings {
    success: string
    failure: string
}
export interface updateOneResponseHandlerResponse {
    updated: boolean
    messageSent: boolean
}

function responsesEqual(response: updateOneResponse, expected: updateOneResponse): boolean {
    const properties = ['n', 'nModified', 'ok']
    let ret = true
    properties.forEach((prop) => {
        //@ts-ignore
        if (!(response[prop] === expected[prop])) {
            ret = false
        }
    })
    return ret
}

export function updateOneResponseHandler(
    response: updateOneResponse,
    strings: updateOneStrings,
    textChannel?: TextBasedChannels,
    expectedResponseInput?: updateOneResponse
): Promise<updateOneResponseHandlerResponse> {
    return new Promise<updateOneResponseHandlerResponse>((resolve, reject) => {
        try {
            const resolveResponse: updateOneResponseHandlerResponse = {
                updated: false,
                messageSent: false,
            }
            const expectedResponse: updateOneResponse = expectedResponseInput
                ? expectedResponseInput
                : { n: 1, nModified: 1, ok: 1 }

            if (responsesEqual(response, expectedResponse)) {
                resolveResponse.updated = true
                // matches expectations, send success
                if (textChannel) {
                    sendToChannel(textChannel, strings.success)
                        .then(() => {
                            resolveResponse.messageSent = true
                            resolve(resolveResponse)
                        })
                        .catch(() => {
                            resolveResponse.messageSent = false
                            resolve(resolveResponse)
                        })
                } else {
                    resolve(resolveResponse)
                }
            } else {
                if (textChannel) {
                    sendToChannel(textChannel, strings.failure)
                        .then(() => {
                            resolveResponse.messageSent = true
                            resolve(resolveResponse)
                        })
                        .catch(() => {
                            resolveResponse.messageSent = false
                            resolve(resolveResponse)
                        })
                } else {
                    resolve(resolveResponse)
                }
            }
        } catch (error) {
            reject(error)
        }
    })
}

export function uniqueArrayObject(array: any[], newElementIds: any[], uniqueMatcher?: string) {
    const filter = (newID: string) => {
        return (
            !array.find((arrayElement) => {
                const matcher = uniqueMatcher ? arrayElement[uniqueMatcher] : arrayElement
                return matcher == newID
            }) && !keywords.find((x) => x == newID)
        )
    }

    let [approved, rejected] = _.partition(newElementIds, filter)

    // ensures no duplicates in the approved aliases
    approved = approved.filter((v, i, s) => s.indexOf(v) === i)

    return { approved: approved, rejected: rejected }
}
