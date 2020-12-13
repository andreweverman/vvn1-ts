import { Message, Collection, Client } from "discord.js";
import { commandCollection, commandCooldowns } from "../bot";
import { NumberConstants } from "../util/constants";
import { sendUtil, deleteMessage } from "../util/prompt.util";

export function messageEvent(
  message: Message,
  client: Client,
  commands: commandCollection,
  cooldowns: commandCooldowns,
  dev: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    const guildPrefix = "";

    const hardPrefix = dev ? process.env.DEV_PREFIX : process.env.PROD_PREFIX;

    if (!hardPrefix) {
      console.error(
        "Please set the DEV_PREFIX and/or PROD_PREFIX in the .env file"
      );
      process.exit(1);
    }
    const prefix = guildPrefix != "" ? guildPrefix : hardPrefix;
    const messageContent = message.content.trim();
    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    const escape_regex = new RegExp(/[-\/\\^$*+?.()|[\]{}]/g);
    const is_command = new RegExp('^[/s]*' + prefix.replace(escape_regex, '\\$&') + '[/w]*').test(message.content)


    if (!is_command || message.author.bot) return;

    if (!commandName) {
      console.log("Somehow got a command without a command name");
      reject("command no name");
      return
    }

    const command =
      commands.get(commandName) ||
      commands.find(
        (cmd) => cmd.aliases != undefined && cmd.aliases.includes(commandName)
      );

    if (!command) {
      // TODO : the links stuff
    } else {

      deleteMessage(message,15*NumberConstants.secs);

      if (command.args && !args.length) {
        let reply = `You didn't provide any arguments for a command that requires them.`;

        if (command.usage) {
          reply += `\nThe proper usage would be something like: ${command.usage}`;
        }

        //   TODO send message


        reject('incorrect usage of command');
      } else {

        if (command.guildOnly && message.channel.type !== 'text') {
          sendUtil(message.reply('I can\'t execute that command inside DMs!'), true, 1 * NumberConstants.mins)
        }
        if (!cooldowns.has(command.name)) {
          cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 1) * NumberConstants.secs;

        if (timestamps && timestamps.has(message.author.id)) {
          const expirationTime =
            timestamps.get(message.author.id)! + cooldownAmount;

          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / NumberConstants.secs;

            reject('command was on cooldown');
          }
        } else if (timestamps) {
          timestamps.set(message.author.id, now);
          setTimeout(
            () => timestamps.delete(message.author.id),
            cooldownAmount
          );

          const guild_id: string | undefined = message.guild?.id;
          try {
            command.execute({
              message,
              client,
              args,
              dev,
              guild_id,
              prefix,
            });

            resolve('good')
          } catch (error) {
            console.error(error);
            reject('error executing command');
          }
        }
      }
    }
  });
}
