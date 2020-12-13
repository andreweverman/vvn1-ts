import { Message, MessageEmbed, TextChannel, CollectorFilter, DMChannel, GroupDMChannel } from "discord.js";
import { NumberConstants, quit, valid, messageCollectorTimeout } from './constants'

export type AsyncCollectorFilter = (...args: any[]) => Promise<boolean>;

export function quitFilter(): CollectorFilter {
    return (m: Message) => m.cleanContent.trim().toLowerCase() == 'quit'
}

export function sameUserFilter(userID: string): CollectorFilter {
    return (m: Message) => m.author.id === userID
}

export type DeleteResponse = (Message | boolean);
export function deleteMessage(message: Message, time: number): Promise<DeleteResponse> {

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
            });
    })
}


export interface sendUtilResponse {
    messages: Message[],
    deleteResponses: Promise<DeleteResponse>[]
}

export function sendUtil(message: Promise<Message>, autoDelete: boolean, autoDeleteTime = 15 * NumberConstants.secs): Promise<sendUtilResponse> {

    const result: sendUtilResponse = {
        messages: [],
        deleteResponses: []
    };

    const postSend = (sentMessage: Message) => {
        if (autoDelete) {
            result.messages.push(sentMessage);
            result.deleteResponses.push(deleteMessage(sentMessage, autoDeleteTime));
        }
    }

    return new Promise((resolve, reject) => {

        message.then(async (sentMessage: Message | Message[]) => {

            if (sentMessage instanceof Message) {
                postSend(sentMessage);
            }
            else {
                sentMessage.forEach(individualMessage => {
                    postSend(individualMessage);
                });
            }

            resolve(result);

        }).catch((error: Error) => {
            reject(error);
        })

    })
}

export function sendToChannel(channel: TextChannel | DMChannel | GroupDMChannel, statement: String, autoDelete = true, autoDeleteTime = 15 * NumberConstants.secs): Promise<sendUtilResponse> {

    return sendUtil(channel.send(statement), autoDelete, autoDeleteTime);

}


// want to return the message 
export function getSameUserInput(userID: string, textChannel: TextChannel | DMChannel | GroupDMChannel, messagePrompt: string | MessageEmbed, filter: AsyncCollectorFilter | CollectorFilter, time = 30 * NumberConstants.secs): Promise<Message | null> {

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


                const filterResult = await filter(m);
                if (filterResult) {
                    messageCollector.stop(valid);
                } else if (quitFilter()(m)) {
                    messageCollector.stop(quit);
                } else {
                    sendToChannel(textChannel, "Invalid response. Please try again.", true, 10 * NumberConstants.secs);
                    completed = false;
                }

                if (completed) deleteMessage(promptMessage, 10 * NumberConstants.secs);
                deleteMessage(m, 10 * NumberConstants.secs);

                messageCollector.on('end', (collected, reason) => {

                    [quit, messageCollectorTimeout].includes(reason) ?
                        resolve(null) :
                        resolve(collected.last())

                });

            });

        }).catch((err) => {
            console.error(err);
            reject(new Error('Error sending prompt message'));
        })

    })

}