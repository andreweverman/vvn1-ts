/**
 *
 * Mongo model for the guild collection
 *
 * The guild document as well as its subdocuments are defined here
 *
 *
 * @file   Mongo guild collection model
 * @author Andrew Everman.
 * @since  29.10.2020
 */

import mongoose, { Schema, Document, ObjectId } from 'mongoose'
import { Config, Link } from '../controllers/guildController'
import { movieCountdownName, movieTimeName, readyEmojiName, willWatchEmojiName } from '../../util/constants'
import { findLastKey } from 'lodash'
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
    premium: boolean
    prefix: string
    autodelete: IAutoDeleteElementDoc[]
    archive: IArchiveDoc
    tz: { name: string }
}

const ConfigSchema = new mongoose.Schema({
    premium: { type: Boolean, default: false, required: true },
    prefix: { type: String, default: '?', required: true },
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
    inProgress: boolean
    completed: boolean
    userID: string
    textChannelID?: string
    movieName: string
    zipName: string
    zipPassword: string
    torrentLink: string
    percentDone: number
}

export interface IMovieDownloadElementDoc extends IMovieDownloadElement, Document {}

const MovieDownloadElementSchema = new mongoose.Schema({
    inProgress: { type: Boolean, required: true, default: false },
    completed: { type: Boolean, required: true, default: false },
    userID: { type: String, required: true },
    textChannelID: { type: String, required: false },
    movieName: { type: String, required: true },
    torrentLink: { type: String, required: true },
    zipName: { type: String, required: true },
    zipPassword: { type: String, required: true },
    percentDone: { type: Number, required: true, default: 0 },
})

export interface IMovieUploadElement {
    inProgress: boolean
    completed: boolean
    userID: string
    textChannelID?: string
    movieName: string
    zipPassword: string
    zipPath: string
    megaPath?: string
    uploadLink?: string
    percentDone: number
}
export interface IMovieUploadElementDoc extends IMovieUploadElement, Document {}
const MovieUploadElementSchema = new mongoose.Schema({
    inProgress: { type: Boolean, required: true, default: false },
    completed: { type: Boolean, required: true, default: false },
    userID: { type: String, required: true },
    textChannelID: { type: String, required: false },
    movieName: { type: String, required: true },
    zipPath: { type: String, required: true },
    megaPath: { type: String, required: false },
    uploadLink: { type: String, required: false },
    percentDone: { type: Number, required: true, default: 0 },
})

export interface IMovieUploadedElement {
    movieID: ObjectId
    megaLink: string
    removeElement: boolean
}

export interface IMovieUploadedElementDoc extends IMovieUploadedElement, Document {}

const MovieUploadedElementSchema = new mongoose.Schema({
    movieID: { type: mongoose.Schema.Types.ObjectId },
    megaLink: { type: String, required: true },
    removeElement: { type: Boolean, required: true, default: false },
})

export enum MovieStatus {
    DOWNLOADING = 'DOWNLOADING',
    UPLOADING = 'UPLOADING',
    UPLOADED = 'UPLOADED',
    ERROR = 'ERROR',
}
export interface IMovieStatusUpdate {
    started: boolean
    userID: string
    textChannelID: string
    status: MovieStatus
    percent: number
    movieName: string
    seconds: number
}
export interface IMovieStatusUpdateDoc extends IMovieStatusUpdate, Document {}
const MovieStatusUpdateSchema = new mongoose.Schema({
    started: { type: Boolean, required: true, default: false },
    userID: { type: String, required: true },
    textChannelID: { type: String, required: true },
    status: { type: String, required: true },
    percentDone: { type: Number, required: true, default: 0 },
    movieName: { type: String, required: true },
    seconds: { type: Number, required: true, default: 0 },
})

export interface IMovieDownloadContainer {
    downloadQueue: IMovieDownloadElement[]
    uploadQueue: IMovieUploadElement[]
    uploadedQueue: IMovieUploadedElement[]
    statusUpdate: IMovieStatusUpdate[]
}

export interface IMovieDownloadContainerDoc extends IMovieDownloadContainer, Document {
    downloadQueue: IMovieDownloadElementDoc[]
    uploadQueue: IMovieUploadElementDoc[]
    uploadedQueue: IMovieUploadedElementDoc[]
    statusUpdate: IMovieStatusUpdateDoc[]
}

const MovieDownloadContainerSchema = new mongoose.Schema({
    downloadQueue: { type: [MovieDownloadElementSchema], required: true, default: [] },
    uploadQueue: { type: [MovieUploadElementSchema], required: true, default: [] },
    uploadedQueue: { type: [MovieUploadedElementSchema], required: true, default: [] },
    statusUpdate: { type: [MovieStatusUpdateSchema], required: true, default: [] },
})

export interface IDownloadedMovie {
    path: string
    name: string
}

export interface IDownloadedMovieDoc extends IDownloadedMovie, Document {}

const DownloadedMovieSchema = new mongoose.Schema({
    path: { type: String, required: true },
    name: { type: String, required: true },
})

export interface IMovieList {
    movies: IDownloadedMovie[]
    last_updated: Date
    awaiting_update: boolean
    uploadQueue: IDownloadedMovie[]
}

export interface IMovieListDoc extends IMovieList, Document {
    movies: IDownloadedMovieDoc[]
    last_updated: Date
    awaiting_update: boolean
    uploadQueue: IDownloadedMovieDoc[]
}

const MovieListSchema = new mongoose.Schema({
    movies: { type: [DownloadedMovieSchema], default: [], required: true },
    awaiting_update: { type: Boolean, default: true, required: true },
    last_updated: { type: Date, required: true, default: new Date() },
    uploadQueue: { type: [DownloadedMovieSchema], default: [], required: true },
})

export interface IMovieContainer {
    default_password: string
    sounds: ISound[]
    emojis: IReactionEmoji[]
    movies: IMovie[]
    requests: IMovieRequest[]
    downloads: IMovieDownloadContainer[]
    movie_list: IMovieList
}
export interface IMovieContainerDoc extends Document {
    default_password: string
    sounds: ISoundDoc[]
    emojis: IReactionEmojiDoc[]
    movies: IMovieDoc[]
    requests: IMovieRequestDoc[]
    downloads: IMovieDownloadContainerDoc
    movie_list: IMovieListDoc
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
    movie_list: MovieListSchema,
})

interface IPlayer {
    lastStreamingTime: Date
    lastChannelID: string
}

interface IPlayerDoc extends IPlayer, Document {}

const PlayerSchema = new mongoose.Schema({
    lastStreamingTime: { type: Date, required: true, default: new Date() },
    lastChannelID: { type: String },
})

export interface IGuild {
    guild_id: string
    config: IConfigDoc
    aliases: IAliasDoc[]
    movie: IMovieContainerDoc
    links: ILinkDoc[]
    player: IPlayerDoc
}

export interface IGuildDoc extends IGuild, Document {}

const GuildSchema = new mongoose.Schema({
    guild_id: { type: String, unique: true, index: true },
    config: { type: ConfigSchema, default: {} },
    aliases: [AliasSchema],
    movie: { type: MovieSchema, default: {} },
    links: [LinkSchema],
    player: PlayerSchema,
})

export default mongoose.model<IGuildDoc>('Guild', GuildSchema)
