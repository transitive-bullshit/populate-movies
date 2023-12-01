import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { TMDB } from './lib/tmdb'
import { getNumBatches, getTMDBMovieDump } from './lib/utils'

/**
 * Takes a dump of movies from TMDB and fetches all of the movie details from
 * TMDB in batches.
 */
async function main() {
  await makeDir(config.outDir)

  const dumpedMovies = await getTMDBMovieDump()
  const numBatches = await getNumBatches()

  // sort input movies by popularity so we process more popular movies first
  dumpedMovies.sort((a, b) => b.popularity - a.popularity)

  const tmdb = new TMDB({ bearerToken: process.env.TMDB_BEARER_TOKEN })
  let batchNum = 0
  let numPopulatedMoviesTotal = 0

  do {
    const startIndex = batchNum * config.batchSize
    const dumpedMoviesBatch = dumpedMovies.slice(
      startIndex,
      startIndex + config.batchSize
    )

    console.log(
      `\npopulating ${dumpedMoviesBatch.length} movies in batch ${batchNum} (${config.tmdbMovieIdsDumpPath})\n`
    )

    const populatedMovies = (
      await pMap(
        dumpedMoviesBatch,
        async (dumpedMovie, index) => {
          // ignore adult movies
          if (dumpedMovie.adult) {
            return null
          }

          let movieDetails: types.tmdb.MovieDetails
          // let movieCredits: types.tmdb.Credits
          let numErrors = 0

          while (true) {
            try {
              console.log(
                `${batchNum}:${index})`,
                dumpedMovie.id,
                dumpedMovie.original_title
              )

              if (!movieDetails) {
                movieDetails = await tmdb.getMovieDetails(dumpedMovie.id, {
                  videos: true,
                  images: true,
                  externalIds: true
                })

                // console.log(JSON.stringify(movieDetails, null, 2))
                // return
              }

              // uncomment if you want to record credits as well
              // if (!movieCredits) {
              //   movieCredits = await tmdb.getMovieCredits(dumpedMovie.id)

              //   // we only store a slimmed down version of the credits
              //   movieDetails.cast =
              //     movieCredits.cast?.map(
              //       (credit) => credit.name || credit.original_name
              //     ) || []

              //   const director = movieCredits.crew?.find(
              //     (credit) => credit.job === 'Director'
              //   )
              //   if (director) {
              //     movieDetails.director =
              //       director.name || director.original_name
              //   }
              // }

              return movieDetails
            } catch (err) {
              if (++numErrors >= 3 || err.response?.statusCode === 404) {
                console.error(
                  'tmdb unrecoverable error',
                  dumpedMovie.id,
                  dumpedMovie,
                  err.toString()
                )

                return null
              } else {
                console.warn('tmdb error', dumpedMovie.id, err.toString())

                await delay(1000 * numErrors * numErrors)
              }
            }
          }
        },
        {
          concurrency: 32
        }
      )
    ).filter(Boolean)

    const numPopulatedMovies = populatedMovies.length
    numPopulatedMoviesTotal += numPopulatedMovies

    if (!populatedMovies.length) {
      const message = `error batch ${batchNum} failed to fetch any movies`
      console.error()
      console.error(message)
      console.error()

      throw new Error(message)
    }

    // console.log(JSON.stringify(populatedMovies, null, 2))

    await fs.writeFile(
      `${config.outDir}/tmdb-${batchNum}.json`,
      JSON.stringify(populatedMovies, null, 2).replaceAll(/^\s*/gm, ''),
      {
        encoding: 'utf-8'
      }
    )

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMoviesInBatch: dumpedMoviesBatch.length,
      numPopulatedMovies,
      percentPopulatedMovies: `${
        ((numPopulatedMovies / dumpedMoviesBatch.length) * 100) | 0
      }%`
    })
    console.log()

    ++batchNum
  } while (batchNum < numBatches)

  console.log(`done; ${batchNum} batches;`, {
    numDumpedMoviesTotal: dumpedMovies.length,
    numPopulatedMoviesTotal,
    percentPopulatedMoviesTotal: `${
      ((numPopulatedMoviesTotal / dumpedMovies.length) * 100) | 0
    }%`
  })
}

main()
