import { Message, MessageEmbed, TextChannel, CollectorFilter } from "discord.js";
import { NumberConstants, StringConstants } from './constants'


export function quitFilter(): CollectorFilter {
    return (m: Message) => m.cleanContent.trim().toLowerCase() == 'quit'
}

export function sameUserFilter(userID: string): CollectorFilter {
    return (m: Message) => m.author.id === userID
}

export function deleteMessage(message: Message, time: number): Promise<Message | boolean> {

    return new Promise((resolve, reject) => {

        message.delete(time)
            .then((deletedMessage: Message) => {
                resolve(deletedMessage);
            })
            .catch((error: any) => {
                if (error.httpStatus != 404) {
                    reject(error);
                } else {
                    resolve(true);
                }

            })
    })
}

export function sendUtil(message: Promise<Message>, autoDelete: boolean, autoDeleteTime = 15 * NumberConstants.secs): Promise<Message | boolean | (Message | boolean)[]> {

    return new Promise((resolve, reject) => {

        message.then(async (sentMessage: Message | Message[]) => {

            if (sentMessage instanceof Message) {
                deleteMessage(sentMessage, autoDeleteTime).then((x: Message | boolean) => {
                    resolve(x);
                }).catch((error: Error) => {
                    reject(error);
                })
            }
            else {
                let resArr: Array<Message | boolean> = []
                sentMessage.forEach(individualMessage => {
                    deleteMessage(individualMessage, autoDeleteTime).then((x: Message | boolean) => {
                        resArr.push(x);
                    }).catch((error: Error) => {
                        reject(error);
                    });
                })
                resolve(resArr)
            }

        }).catch((error: Error) => {
            reject(error);
        })

    })
}

export function sendToChannel(channel: TextChannel, statement: String, autoDelete = true, autoDeleteTime = 15 * NumberConstants.secs): Promise<Message | boolean | (Message | boolean)[]> {

    return sendUtil(channel.send(statement), autoDelete, autoDeleteTime);

}



export function getSameUserInput(userID: string, textChannel: TextChannel, messagePrompt: string | MessageEmbed, filter: CollectorFilter, time = 30 * NumberConstants.secs) {

    return new Promise((resolve, reject) => {

        textChannel.send(messagePrompt).then((promptMessage: Message) => {

            // this first filter is just to make sure the message is from the user.
            // the collected messages are then further filtered

            const messageCollector = textChannel.createMessageCollector(
                sameUserFilter(userID),
                { time: time }
            );

            messageCollector.on('collect', async (m: Message) => {

                // valid response. need to further filter and respond accordingly

                let completed: Boolean = true;

                const filterResult = await filter(m)
                if (filterResult) {
                    messageCollector.stop('valid');
                } else if (quitFilter()(m)) {
                    messageCollector.stop(StringConstants.quit);
                } else {
                    sendToChannel(textChannel, "Invalid response. Please try again.", true, 10 * NumberConstants.secs)
                    completed = false;
                }

                if (completed) deleteMessage(promptMessage, 10 * NumberConstants.secs);

                messageCollector.on('end', (collected, reason) => {

                    let resolve_obj
                })

            });

        })

    })

}