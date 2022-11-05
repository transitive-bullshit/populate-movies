import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { TMDB } from './lib/tmdb'

/**
 * Takes a dump of movies from TMDB and fetches all of the movie details from
 * TMDB in batches.
 */
async function main() {
  await makeDir(config.outDir)

  const rawMovieDump = await fs.readFile(config.tmdbMovieIdsDumpPath, {
    encoding: 'utf-8'
  })
  const dumpedMovies: types.tmdb.DumpedMovie[] = JSON.parse(rawMovieDump)

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
    if (!dumpedMoviesBatch.length) {
      break
    }

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

          let numErrors = 0

          while (true) {
            try {
              console.log(
                `${batchNum}:${index})`,
                dumpedMovie.id,
                dumpedMovie.original_title
              )

              const movieDetails = await tmdb.getMovieDetails(dumpedMovie.id, {
                videos: true,
                images: true
              })

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
          concurrency: 16
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

    // console.log(JSON.stringify(populatedMovies, null, 2).replaceAll(/^\s*/gm, ''))
    // break

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
  } while (true)

  console.log(`done; ${batchNum} batches;`, {
    numDumpedMoviesTotal: dumpedMovies.length,
    numPopulatedMoviesTotal,
    percentPopulatedMoviesTotal: `${
      ((numPopulatedMoviesTotal / dumpedMovies.length) * 100) | 0
    }%`
  })
}

main()
