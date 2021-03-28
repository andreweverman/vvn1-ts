import mongoose, { Schema, Document, ObjectId } from 'mongoose'
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
    volume: { type: Number, required: false },
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
    save_bot_commands: boolean
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
        save_bot_commands: { type: Boolean, default: false },
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
    want_to_watch: string[]
    mega: boolean
    megaID?: ObjectId
    zipName?:string
}

export interface IMovieDoc extends IMovie, Document {}

const IndividualMovieSchema = new mongoose.Schema({
    name: { type: String, unique: false, index: true, required: true },
    link: { type: String, required: true },
    user: { type: String },
    password: { type: String },
    want_to_watch: { type: Array, default: [] },
    mega: { type: Boolean, required: true, default: false },
    megaID: { type: mongoose.Schema.Types.ObjectId },
    zipName: { type: String, },
})

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

export interface IMovieDownloadElement {
    userID: string
    movieName: string
    torrentLink: string
    zipName: string
    zipPassword: string
    downloading: boolean
    secondsDownloading: number
    downloaded: boolean
    downloadPercent: number
    uploading: boolean
    uploaded: boolean
    secondsUploading: number
    uploadPercent: number
    error: boolean
    errorReason?: string
    uploadLink?: string
    movieID?: mongoose.ObjectId
}

export interface IMovieDownloadElementDoc extends IMovieDownloadElement, Document {}

const MovieDownloadElementSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    movieName: { type: String, required: true },
    torrentLink: { type: String, required: true },
    zipName: { type: String, required: true },
    zipPassword: { type: String, required: true },
    downloading: { type: Boolean, required: true },
    secondsDownloading: { type: Number, required: true },
    downloaded: { type: Boolean, required: true },
    downloadPercent: { type: Number, required: true },
    uploading: { type: Boolean, required: true },
    uploaded: { type: Boolean, required: true },
    secondsUploading: { type: Number, required: true },
    uploadPercent: { type: Number, required: true },
    error: { type: Boolean, required: true },
    errorReason: { type: String, required: false },
    uploadLink: { type: String, required: false },
    movieID: { type: mongoose.Schema.Types.ObjectId, required: false },
})

export interface IMovieDownloadContainer {
    downloadQueue: IMovieDownloadElement[]
    uploadedQueue: IMovieDownloadElement[]
    deleteQueue: string[]
}

export interface IMovieDownloadContainerDoc extends IMovieDownloadContainer, Document {
    downloadQueue: IMovieDownloadElementDoc[]
    uploadedQueue: IMovieDownloadElementDoc[]
    deleteQueue:string[]
}

const MovieDownloadContainerSchema = new mongoose.Schema({
    downloadQueue: { type: [MovieDownloadElementSchema], required: true, default: [] },
    uploadedQueue: { type: [MovieDownloadElementSchema], required: true, default: [] },
    deleteQueue: { type: [String], required: true, default: [] },
})

export interface IMovieContainer {
    default_password: string
    sounds: ISound[]
    emojis: IReactionEmoji[]
    movies: IMovie[]
    requests: IMovieRequest[]
    downloads: IMovieDownloadContainer[]
}

export interface IMovieContainerDoc extends Document {
    default_password: string
    sounds: ISoundDoc[]
    emojis: IReactionEmojiDoc[]
    movies: IMovieDoc[]
    requests: IMovieRequestDoc[]
    downloads: IMovieDownloadContainerDoc
}

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
    movies: [IndividualMovieSchema],
    requests: [MovieRequestSchema],
    downloads: MovieDownloadContainerSchema,
})

interface IPlayer{
    lastStreamingTime:Date
    lastChannelID:string
}

interface IPlayerDoc extends IPlayer,Document {}

const PlayerSchema = new mongoose.Schema({
    lastStreamingTime: {type:Date, required: true,default: new Date()},
    lastChannelID:{type:String}
})

export interface IGuild {
    guild_id: string
    premium: boolean
    config: IConfigDoc
    aliases: IAliasDoc[]
    movie: IMovieContainerDoc
    links: ILinkDoc[],
    player:IPlayerDoc
}

export interface IGuildDoc extends IGuild, Document {}

const GuildSchema = new mongoose.Schema({
    guild_id: { type: String, unique: true, index: true },
    premium: { type: Boolean, required: true, default: false },
    config: { type: ConfigSchema, default: {} },
    aliases: [AliasSchema],
    movie: { type: MovieSchema, default: {} },
    links: [LinkSchema],
    player: PlayerSchema
})

export default mongoose.model<IGuildDoc>('Guild', GuildSchema)
