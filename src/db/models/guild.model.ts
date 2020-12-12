import mongoose, { Schema, Document } from "mongoose";

export interface ILink extends Document {
  names: Array<string>;
  link: string;
  uploader: string;
  type: string;
  volume: number;
}

export interface ILinkDoc extends ILink, Document { }

const LinkSchema: Schema = new Schema({
  names: { type: Array, default: [] },
  link: { type: String, required: true },
  uploader: { type: String },
  type: { type: String, required: true },
  begin: { type: String },
  duration: { type: Number },
  volume: { type: mongoose.Schema.Types.Number, required: false },
});

export interface IAlias {
  name: string;
  id: string;
  type: string;
}

export interface IAliasDoc extends IAlias, Document { 
  id:string
}

const AliasSchema = new mongoose.Schema({
  name: { type: String, unique: false, index: true },
  id: { type: String, required: true },
  type: { type: String, required: true },
});


export interface IConfig {
  prefix: string;
  autodelete_members: Array<string>;
  audodelete_prefixes: Array<string>;
  archive: {
    enabled: boolean;
    channel: string;
  };
  tz: { name: string };
}

export interface IConfigDoc extends IConfig, Document { }

const ConfigSchema = new mongoose.Schema({
  prefix: { type: String, default: "?" },
  autodelete_members: { type: Array, default: [] },
  autodelete_prefixes: { type: Array, default: [] },
  archive: {
    enabled: { type: Boolean, default: false },
    channel: { type: String, default: null },
  },
  tz: {
    type: Object,
    default: { name: "America/Indianapolis" },
  },
});


export interface IMovie {
  default_password: string;
  sounds: {
    name: string;
    enabled: boolean;
  };
  emojis: Array<{
    name: string;
    emoji: string;
    backup: string;
  }>;
  movies: Array<{
    name: string;
    link: string;
    user: string;
    password: string;
  }>;
  requests: Array<{
    name: string;
    user: string;
  }>;
}

export interface IMovieDoc extends IMovie, Document { }

const MovieSchema = new mongoose.Schema({
  default_password: { type: String, default: "" },
  sounds: {
    type: Array,
    default: [
      {
        name: "movie_countdown",
        enabled: true,
      },
      {
        name: "movie_time",
        enabled: true,
      },
    ],
    required: true,
  },
  emojis: {
    type: Array,
    default: [
      {
        name: "ready",
        emoji: ":thumbsup:",
        backup: ":thumbsup:",
      },
      {
        name: "will_watch",
        emoji: ":eyes:",
        backup: ":eyes:",
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
});


// ? all over the shits because guild_id is the only key
export interface IGuild {
  guild_id: string;
  config?: IConfig;
  aliases?: Array<IAlias>;
  movie?: IMovie;
  links?: Array<ILink>;
}

export interface IGuildDoc extends IGuild, Document { }

const GuildSchema = new mongoose.Schema({
  guild_id: { type: String, unique: true, index: true },
  config: { type: ConfigSchema, default: {} },
  aliases: [AliasSchema],
  movie: { type: MovieSchema, default: {} },
  links: [LinkSchema],
});

export default mongoose.model<IGuildDoc>("Guild", GuildSchema);
