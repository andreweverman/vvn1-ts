import { Client, Collection, Message, TextChannel } from "discord.js";
import dotenv from "dotenv";

import { NumberConstants } from "./util/constants";
import * as other_util from "./util/other_util";
import { messageEvent } from "./events/message.event";

dotenv.config();

export interface CommandParams {
  message: Message;
  client: Client;
  args: string[];
  dev: boolean;
  guild_id: string | undefined;
  prefix: string;
}

export interface commandProperties {
  name: string;
  aliases?: string[];
  args: boolean;
  description: string;
  usage: string;
  cooldown: number;
  guildOnly: boolean;
  execute: (event: CommandParams) => any;
}

export interface commandCollection
  extends Collection<string, commandProperties> {}

export interface commandCooldowns
  extends Collection<string, Collection<string, number>> {}

const dev: boolean = process.env.NODE_ENV == "dev" ? true : false;
const client = new Client(),
  commands: Collection<string, commandProperties> = new Collection(),
  cooldowns: Collection<string, Collection<string, number>> = new Collection();

client.once("ready", () => {
  console.log("Ready!");
});

// loading all of the commands
const commandFiles: string[] | null = other_util.get_command_files();
if (!commandFiles) {
  !dev
    ? process.exit(1)
    : console.log("WARNING: There are no commands configured");
} else {
  for (const file of commandFiles) {
    const command = require(file).default;
    commands.set(command.name, command);
  }
}

client.on("message", async (message) => {
  // todo get this from mongo again
  messageEvent(message, client, commands, cooldowns, dev);
});

client.login(process.env.TOKEN);
