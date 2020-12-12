import { CommandParams, commandProperties } from "../bot";

const command: commandProperties = {
  name: "test",
  args: false,
  description: "Yes",
  usage: "Like this",
  cooldown: 1,
  guildOnly: true,
  execute(p: CommandParams) {
    console.log('got there');
  },
};


export default command;
