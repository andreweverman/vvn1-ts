export interface matchOptions {
    insensitive?: boolean,
    trimInput?: boolean,
    trimRegex?: boolean,
    loose: boolean
}

export function exactMatch(str: string, options: matchOptions): RegExp {

    const flags = options.insensitive ? 'i' : '';
    const matchStr = options.trimRegex == false ? str : str.trim();
    return new RegExp(`^${matchStr}$`, flags);
}

export function looseMatch(str: string, options: matchOptions): RegExp {
    const flags = options.insensitive ? 'i' : '';
    const matchStr = options.trimRegex == false ? str : str.trim();
    return new RegExp(`${matchStr}`, flags)
}