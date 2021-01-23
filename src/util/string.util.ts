export interface matchOptions {
    insensitive?: boolean
    trimInput?: boolean
    trimRegex?: boolean
    loose: boolean
    minLength?: number
    maxLength?: number
}

export function stringMatch(str: string, options: matchOptions): RegExp {
    const flags = options.insensitive ? 'i' : ''
    const matchStr = options.trimRegex == false ? str : str.trim()
    return options.loose ? new RegExp(`${matchStr}`, flags) : new RegExp(`^${matchStr}$`, flags)
}

export const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/

export const magnetRegex = /magnet:\?xt=urn:[a-z0-9]{20,50}/i

export const validFileRegex = /^[0-9a-zA-Z ... ]+$/

export const youtubeRegex = /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/

export const spaceCommaRegex = /[ ,]+/

export const discordUserAtRegex = /^<@!\d+>$/

export const discordMemberID = /\d+/

export function validUserID(testID: string): string | null {
    if (!discordUserAtRegex.test(testID) && !/^\d$/.test(testID)) return null
    const regexArr = discordMemberID.exec(testID)
    if (!regexArr || regexArr.length < 0) return null
    const userID = regexArr[0]
    return userID
}

export const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\s*([AP][M])?$/i

export const dateRegex = /^(?:(?:(?:0?[13578]|1[02])(\/|-|\.)31)\1|(?:(?:0?[1,3-9]|1[0-2])(\/|-|\.)(?:29|30)\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:0?2(\/|-|\.)29\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:(?:0?[1-9])|(?:1[0-2]))(\/|-|\.)(?:0?[1-9]|1\d|2[0-8])\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/i

export const guildEmojiRegex = /^<:(\w*):(\d*)>$/
