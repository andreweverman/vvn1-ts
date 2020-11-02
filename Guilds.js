/**
 * Defines the Guild model in Mongo.
 * 
 * Defines the Guild model as well as the subdocuments
 * currently has 
 *  alias
 *  config
 *  movie
 *  link.
 * 
 * @file   This files defines the Guild model in Mongo
 * @author Andrew Everman.
 * @since  11.1.2020
 */

const mongoose = require('mongoose');

const Alias = new mongoose.Schema({
    name: { type: String, unique: false, index: true },
    id: { type: String, required: true },
    type: { type: String, required: true },
});


const Config = new mongoose.Schema({
    prefix: { type: String, default: "?" },
    autodelete_members: { type: Array, default: [] },
    autodelete_prefixes: { type: Array, default: [] },
    archive: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null }
    },
    tz: {
        type: Object, default: { name: "America/Indianapolis" }
    }
});


const Link = new mongoose.Schema({
    names: { type: Array, default: [] },
    link: { type: String, required: true },
    uploader: { type: String },
    type: { type: String, required: true },
    begin: { type: String },
    duration: { type: Number },
    volume: { type: mongoose.Schema.Types.Number, required: false }
});

const Movie = new mongoose.Schema({
    default_password: { type: String, default: "" },
    sounds: {
        type: Array, default: [
            {
                name: "movie_countdown",
                enabled: true,
            },
            {
                name: "movie_time",
                enabled: true,
            },
        ], required: true
    },
    emojis: {
        type: Array, default: [
            {
                name: "ready",
                emoji: ":thumbsup:",
                backup: ":thumbsup:"
            },
            {
                name: "will_watch",
                emoji: ":eyes:",
                backup: ":eyes:"
            },
        ],
        required: true
    },
    movies: [{
        name: { type: String, unique: false, index: true, required: true },
        link: { type: String, required: true },
        user: { type: String },
        password: { type: String }
    }],
    requests: [{
        name: { type: String, unique: false, index: true, required: true },
        user: { type: String },
    }]

});


/* The overall guild
Currently supports:
    - config tab for various guild level things
    - aliases for users and channels
    - movie. store movie links and other related configs
    - links. store links and playable voice clips
*/
const Guilds = new mongoose.Schema({
    guild_id: { type: String, unique: true, index: true },
    config: { type: Config, default: {} },
    aliases: [Alias],
    movie: { type: Movie, default: {} },
    links: [Link],

});
Guilds.plugin(findorcreate);

module.exports = mongoose.model('Guilds', Guilds)