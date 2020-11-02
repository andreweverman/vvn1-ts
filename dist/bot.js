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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = require("fs");
const other_util = __importStar(require("./util/other_util"));
dotenv_1.default.config();
const dev = process.env.DEV;
const client = new discord_js_1.Client(), commands = new discord_js_1.Collection();
// loading all of the commands
let command_files = other_util.get_command_files();
for (const file of command_files) {
    const command = require(file);
    commands.set(command.name, command);
}
fs_1.readdir("./commands/", (err, allFiles) => {
    if (err)
        console.log(err);
    let files = allFiles.filter((f) => f.split(".").pop() === (dev ? "ts" : "js"));
    if (files.length <= 0)
        console.log("No commands found!");
    else
        for (let file of files) {
            const props = require(`./commands/${file}`);
            commands.set(props.names, props.run);
        }
});
client.login(process.env.TOKEN);
//# sourceMappingURL=bot.js.map