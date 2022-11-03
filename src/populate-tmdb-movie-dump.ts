import fs from 'node:fs/promises'

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
  let numMoviesTotal = 0

  do {
    const startIndex = batchNum * config.batchSize
    const dumpedMoviesBatch = dumpedMovies.slice(
      startIndex,
      startIndex + config.batchSize
    )
    if (!dumpedMoviesBatch.length) {
      break
    }

    const movies = (
      await pMap(
        dumpedMoviesBatch,
        async (dumpedMovie, index) => {
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
            console.warn('tmdb error', dumpedMovie.id, err)
          }
        },
        {
          concurrency: 16
        }
      )
    ).filter(Boolean)

    numMoviesTotal += movies.length

    if (!movies.length) {
      const message = `error batch ${batchNum} failed to fetch any movies`
      console.error()
      console.error(message)
      console.error()

      throw new Error(message)
    }

    // console.log(JSON.stringify(movies, null, 2).replaceAll(/^\s*/gm, ''))
    // break

    await fs.writeFile(
      `${config.outDir}/tmdb-${batchNum}.json`,
      JSON.stringify(movies, null, 2).replaceAll(/^\s*/gm, ''),
      {
        encoding: 'utf-8'
      }
    )

    console.log()
    console.log(`batch ${batchNum} done (${movies.length} movies)`)
    console.log()

    ++batchNum
  } while (true)

  console.log(`done; ${batchNum} batches;`, {
    numMoviesTotal
  })
}

main()
