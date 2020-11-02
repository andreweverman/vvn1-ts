import { Client, Collection, Message, TextChannel,} from "discord.js";
import dotenv from "dotenv";
import { readdir } from "fs";
import * as other_util from "./util/other_util";

dotenv.config();

export interface runEvent {
    message: Message,
    client: Client,
    args: string[],
    dev: boolean
}

const dev = process.env.DEV;
const client = new Client(),
	commands = new Collection();



// loading all of the commands
let command_files = other_util.get_command_files();
for (const file of command_files) {
	const command = require(file);
	commands.set(command.name, command);
}

readdir("./commands/", (err, allFiles) => {
	if (err) console.log(err);
	let files = allFiles.filter(
		(f) => f.split(".").pop() === (dev ? "ts" : "js")
	);
	if (files.length <= 0) console.log("No commands found!");
	else
		for (let file of files) {
			const props = require(`./commands/${file}`) as {
				names: string[];
				run: (event: runEvent) => any;
			};
			commands.set(props.names, props.run);
		}
});


client.login(process.env.TOKEN)