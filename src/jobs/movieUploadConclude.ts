/**
 *
 *  Job for when movies are done being uploaded
 * 
 *  If a movie is uploaded, move the movie to the uploaded queue and
 *  add it to the movie list
 * 
 * @file   Movie uploaded job
 * @author Andrew Everman.
 * @since  25.2.2021
 */

import { BatchJob } from './runner'
import { Movie } from '../db/controllers/guildController'
import { IMovieDownloadElementDoc } from '../db/models/guildModel'
import { Types } from 'mongoose'

const rule = '* * * * *'
const jobFunction = async function () {
    const downloadedMoviesArr = await Movie.getDownloadedMovies()

    downloadedMoviesArr.forEach((guild) => {
        guild.downloads.forEach(async (movie) => {
            // being weird Idk
            // movie = movie as IMovieDownloadElementDoc
            if (movie.uploadLink) {
                const movieID = new Types.ObjectId() as any
                const movieObj = await Movie.addMovie(
                    guild.guildID,
                    movie.userID,
                    movie.uploadLink,
                    movie.movieName,
                    movie.zipPassword,
                    true,
                    movieID
                )

                Movie.moveToUploaded(guild.guildID, movie,movieID)
            }
        })
    })
}

const job: BatchJob = {
    rule: rule,
    function: jobFunction,
}

export default job
