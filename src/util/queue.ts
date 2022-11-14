import amqp from 'amqplib/callback_api'
import { v4 as uuidv4 } from 'uuid'
import { client } from '../bot'
import { updateStatus } from '../jobs/statusUpdate'
export enum Queues {
    movieAdd = 'movieAdd',
    statusUpdate = 'statusUpdate',
}

const url = process.env.QUEUE_URL!
let ch: amqp.Channel
amqp.connect(url, function (err, conn) {
    if (err) {
        console.error('Need to set QUEUE_URL in env')
        process.exit(1)
    }
    conn.createChannel(function (err, channel) {
        ch = channel
    })
})

interface CeleryMessage {
    id: string
    task: string
    retries: number
    args: any[]
}
export const publishToQueue = async (queueName: string, taskName: string, data: any) => {
    let message: CeleryMessage = {
        id: uuidv4(),
        task: taskName,
        retries: 0,
        args: [data],
    }
    ch.assertQueue(queueName, {
        durable: true,
    })
    return ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
    })
}
process.on('exit', (_) => {
    ch.close(() => {
        console.error('Error closing')
    })
    console.log(`Closing rabbitmq channel`)
})

export interface StatusUpdateMessage {
    id: string
    movieName: string
    torrentLink: string
    guildId: string
    textChannelId: string
    percentDone:number,
    timeRemaining:number
}

export function runStatusUpdate() {
    ch.assertQueue(Queues.statusUpdate, {
        durable: true,
    })

    ch.consume(
        Queues.statusUpdate,
        function (msg) {
            if (msg) {
                let status: StatusUpdateMessage = JSON.parse(msg.content.toString())
                updateStatus(status)
            }
        },
        {
            noAck: true,
        }
    )
}
