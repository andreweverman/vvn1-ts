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
    return options.loose ? new RegExp(`^${matchStr}$`, flags) : new RegExp(`^${matchStr}$`, flags)
}

export function linkRegex(): RegExp {
    return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
}

export function youtubeRegex(): RegExp {
    return /http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/
}

export function spaceCommaRegex(): RegExp {
    return /[ ,]+/
}
