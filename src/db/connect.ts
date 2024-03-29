/**
 *
 * Connects to mongodb
 * 
 * @file   Connects to mongodb
 * @author Andrew Everman.
 * @since  29.10.2020
 */
import mongoose from 'mongoose'

type TInput = {
    db: string
}
export default async ({ db }: TInput, topology = true) => {
    mongoose
        .connect(db, {
            useNewUrlParser: true,
            useUnifiedTopology: topology,
            useCreateIndex: true,
        })
        .then(() => {
            return console.info(`Successfully connected to ${db}`)
        })
        .catch((error) => {
            console.error('Error connecting to database: ', error)
            return process.exit(1)
        })
}
