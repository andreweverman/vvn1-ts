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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Guilds = __importStar(require("../models/guild.model"));
const Discord = __importStar(require("discord.js"));
module.exports = function (message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (message.author.bot)
            return;
        const guild_id = message.guild.id;
        const guild_doc = yield Guilds.findOne({ guild_id: guild_id });
        const config_doc = guild_doc.config;
        if (!config_doc || !config_doc.archive.enabled)
            return;
        const bad_prefixes = config_doc.autodelete_prefixes.concat(config_doc.prefix);
        const bad_ids = config_doc.autodelete_members;
        if (!(bad_prefixes.includes(message.cleanContent.charAt(0)) ||
            bad_ids.includes(message.author.id))) {
            let image;
            if (message.attachments.size > 0) {
                for (let [key, value] of message.attachments.entries()) {
                    if (value.height) {
                        image = value.proxyURL;
                    }
                }
            }
            const content = message.content.length > 0 ? message.content : null;
            const archive_channel = message.guild.channels.resolve(config_doc.archive.channel);
            const msg = new Discord.MessageEmbed().addField(`From`, `${message.member}`);
            if (content)
                msg.addField("Content", message.cleanContent);
            if (image)
                msg.setImage(image);
            // archive_channel!.send(msg);
        }
    });
};
//# sourceMappingURL=messageDelete.js.map