import mongoose, { Schema, Document } from 'mongoose'
import { Link } from '../controllers/guild.controller'

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
export interface IAutoDeletePrefixSpecifiedDoc extends IAutoDeleteSpecified, Document {}

// for the allowlist, if starts with that string then we don't autodelete it
export interface IAutoDeletePrefix {
    prefix: string
    allowList: string[]
    specified: IAutoDeleteSpecified[]
    allowMode: boolean
}

export interface IAutoDeletePrefixDoc extends IAutoDeletePrefix, Document {}

const AutoDeletePrefixSchema = new mongoose.Schema({
    prefix: { type: String, required: true },
    allowList: { type: Array, required: true },
    specified: { type: Array, required: true },
    allowMode: { type: Boolean, required: true },
})

export interface IAutoDeleteMember {
    userID: string
    allowList: string[]
    specified: IAutoDeleteSpecified[]
    allowMode: boolean
}

export interface IAutoDeleteMemberDoc extends IAutoDeleteMember, Document {}

const AutoDeleteMemberSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    allowList: { type: Array, required: true },
    specified: { type: Array, required: true },
    allowMode: { type: Boolean, required: true },
})

export interface IArchive {
    enabled: boolean
    channel: string
    saveBotCommands: boolean
}
export interface IArchiveDoc extends IArchive, Document {}

export interface IConfig {
    prefix: string
    autodelete_members: IAutoDeleteMember[]
    autodelete_prefixes: IAutoDeletePrefix[]
    archive: IArchive
    tz: { name: string }
}

export interface IConfigDoc extends Document {
    prefix: string
    autodelete_members: IAutoDeleteMemberDoc[]
    autodelete_prefixes: IAutoDeletePrefixDoc[]
    archive: IArchiveDoc
    tz: { name: string }
}

const ConfigSchema = new mongoose.Schema({
    prefix: { type: String, default: '?' },
    autodelete_members: [AutoDeleteMemberSchema],
    autodelete_prefixes: [AutoDeletePrefixSchema],
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
    user: string
}

export interface IMovieRequestDoc extends IMovieRequest, Document {}

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
                name: 'movie_countdown',
                enabled: true,
            },
            {
                name: 'movie_time',
                enabled: true,
            },
        ],
        required: true,
    },
    emojis: {
        type: Array,
        default: [
            {
                name: 'ready',
                emoji: ':thumbsup:',
                backup: ':thumbsup:',
            },
            {
                name: 'will_watch',
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
    requests: [
        {
            name: { type: String, unique: false, index: true, required: true },
            user: { type: String },
        },
    ],
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
