import * as Guilds from "../models/guild.model";
import * as Discord from "discord.js";

module.exports = async function (message: Discord.Message) {
	if (message.author.bot) return;

	const guild_id = message.guild!.id;

	const guild_doc = await Guilds.findOne({ guild_id: guild_id });
	

	const config_doc = guild_doc.config;

	if (!config_doc || !config_doc.archive.enabled) return;

	const bad_prefixes = config_doc.autodelete_prefixes.concat(
		config_doc.prefix
	);
	const bad_ids = config_doc.autodelete_members;

	if (
		!(
			bad_prefixes.includes(message.cleanContent.charAt(0)) ||
			bad_ids.includes(message.author.id)
		)
	) {
		let image;
		if (message.attachments.size > 0) {
			for (let [key, value] of message.attachments.entries()) {
				if (value.height) {
					image = value.proxyURL;
				}
			}
		}

		const content = message.content.length > 0 ? message.content : null;

		const archive_channel = message.guild!.channels.resolve(
			config_doc.archive.channel
		);
		const msg = new Discord.MessageEmbed().addField(
			`From`,
			`${message.member}`
		);

		if (content) msg.addField("Content", message.cleanContent);
		if (image) msg.setImage(image);

		// archive_channel!.send(msg);

	}
};
