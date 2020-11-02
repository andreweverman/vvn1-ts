"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const LinkSchema = new mongoose_1.Schema({
    names: { type: Array, default: [] },
    link: { type: String, required: true },
    uploader: { type: String },
    type: { type: String, required: true },
    begin: { type: String },
    duration: { type: Number },
    volume: { type: mongoose_1.default.Schema.Types.Number, required: false }
});
const AliasSchema = new mongoose_1.default.Schema({
    name: { type: String, unique: false, index: true },
    id: { type: String, required: true },
    type: { type: String, required: true },
});
const ConfigSchema = new mongoose_1.default.Schema({
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
const MovieSchema = new mongoose_1.default.Schema({
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
const GuildSchema = new mongoose_1.default.Schema({
    guild_id: { type: String, unique: true, index: true },
    config: { type: ConfigSchema, default: {} },
    aliases: [AliasSchema],
    movie: { type: MovieSchema, default: {} },
    links: [LinkSchema],
});
exports.default = mongoose_1.default.model('Guild', GuildSchema);
//# sourceMappingURL=guild.model.js.map