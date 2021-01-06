import mongoose, { Schema, Document } from 'mongoose'
import { Config, Link } from '../controllers/guild.controller'
import {
    NumberConstants,
    movieCountdownName,
    movieTimeName,
    readyEmojiName,
    willWatchEmojiName,
} from '../../util/constants'
export interface ILink {
    names: string[]
    link: string
    uploader: string
    type: Link.LinkTypes
    volume?: number
}

export interface ILinkDoc extends ILink, Document {}

const LinkSchema: Schema = new Schema({
    names: { type: Array, default: [] },
    link: { type: String, required: true },
    uploader: { type: String },
    type: { type: String, required: true },
    volume: { type: mongoose.Schema.Types.Number, required: false },
})

export interface IAlias {
    name: string
    id: string
    type: string
}

export interface IAliasDoc extends IAlias, Document {
    id: string
}

const AliasSchema = new mongoose.Schema({
    name: { type: String, unique: false, index: true },
    id: { type: String, required: true },
    type: { type: String, required: true },
})

export interface IAutoDeleteSpecified {
    startsWith: string
    timeToDelete: number
}
export interface IAutoDeleteSpecifiedDoc extends IAutoDeleteSpecified, Document {}

// for the allowlist, if starts with that string then we don't autodelete it
export interface IAutoDeleteElement {
    matchOn: string
    allowList: string[]
    specified: IAutoDeleteSpecified[]
    allowMode: boolean
    type: Config.AutoDeleteType
    defaultDeleteTime: number
}

export interface IAutoDeleteElementDoc extends IAutoDeleteElement, Document {}

const AutoDeleteSchema = new mongoose.Schema({
    matchOn: { type: String, required: true },
    allowList: { type: Array, required: true },
    specified: { type: Array, required: true },
    allowMode: { type: Boolean, required: true },
    type: { type: String, required: true },
    defaultDeleteTime: { type: Number, required: true, default: 60 },
})

export interface IArchive {
    enabled: boolean
    channel: string
    saveBotCommands: boolean
}
export interface IArchiveDoc extends IArchive, Document {}

export interface IConfig {
    prefix: string
    autodelete: IAutoDeleteElement[]
    archive: IArchive
    tz: { name: string }
}

export interface IConfigDoc extends Document {
    prefix: string
    autodelete: IAutoDeleteElementDoc[]
    archive: IArchiveDoc
    tz: { name: string }
}

const ConfigSchema = new mongoose.Schema({
    prefix: { type: String, default: '?' },
    autodelete: [AutoDeleteSchema],
    archive: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null },
        saveBotCommands: { type: Boolean, default: false },
    },
    tz: {
        type: Object,
        default: { name: 'America/Indianapolis' },
    },
})

export interface IMovie {
    name: string
    link: string
    user: string
    password: string
}

export interface IMovieDoc extends IMovie, Document {}

export interface IMovieRequest {
    name: string
    users: string[]
}

export interface IMovieRequestDoc extends IMovieRequest, Document {}

const MovieRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    users: { type: Array },
})

export interface ISound {
    name: string
    enabled: boolean
}

export interface ISoundDoc extends ISound, Document {}

export interface IReactionEmoji {
    name: string
    emoji: string
    backup: string
}

export interface IReactionEmojiDoc extends IReactionEmoji, Document {}

export interface IMovieContainer {
    default_password: string
    sounds: ISoundDoc[]
    emojis: IReactionEmojiDoc[]
    movies: IMovieDoc[]
    requests: IMovieRequestDoc[]
}

export interface IMovieContainerDoc extends IMovieContainer, Document {}

const MovieSchema = new mongoose.Schema({
    default_password: { type: String, default: '' },
    sounds: {
        type: Array,
        default: [
            {
                name: movieCountdownName,
                enabled: true,
            },
            {
                name: movieTimeName,
                enabled: true,
            },
        ],
        required: true,
    },
    emojis: {
        type: Array,
        default: [
            {
                name: readyEmojiName,
                emoji: ':thumbsup:',
                backup: ':thumbsup:',
            },
            {
                name: willWatchEmojiName,
                emoji: ':eyes:',
                backup: ':eyes:',
            },
        ],
        required: true,
    },
    movies: [
        {
            name: { type: String, unique: false, index: true, required: true },
            link: { type: String, required: true },
            user: { type: String },
            password: { type: String },
        },
    ],
    requests: [MovieRequestSchema],
})

// ? all over the shits because guild_id is the only key
export interface IGuild {
    guild_id: string
    config: IConfigDoc
    aliases: IAliasDoc[]
    movie: IMovieContainerDoc
    links: ILinkDoc[]
}

export interface IGuildDoc extends IGuild, Document {}

const GuildSchema = new mongoose.Schema({
    guild_id: { type: String, unique: true, index: true },
    config: { type: ConfigSchema, default: {} },
    aliases: [AliasSchema],
    movie: { type: MovieSchema, default: {} },
    links: [LinkSchema],
})

export default mongoose.model<IGuildDoc>('Guild', GuildSchema)
