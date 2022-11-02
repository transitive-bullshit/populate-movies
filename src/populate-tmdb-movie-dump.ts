import fs from 'node:fs/promises'

import dotenv from 'dotenv-safe'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as types from './types'
import { TMDB } from './tmdb'

dotenv.config()

/**
 * Takes a TMDB movie dump and fetch all of the movie details from TMDB in batches.
 */
async function main() {
  const outDir = 'out'
  await makeDir(outDir)

  const rawMovieDump = await fs.readFile(
    './data/tmdb_dump_movie_ids_10_30_2022.json',
    {
      encoding: 'utf-8'
    }
  )
  const dumpedMovies: types.tmdb.DumpedMovie[] = JSON.parse(rawMovieDump)
  dumpedMovies.sort((a, b) => b.popularity - a.popularity)

  const tmdb = new TMDB({ bearerToken: process.env.TMDB_API_KEY })

  const batchSize = 32000
  let batchNum = 0

  do {
    const startIndex = batchNum * batchSize
    const dumpedMoviesBatch = dumpedMovies.slice(
      startIndex,
      startIndex + batchSize
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
      `${outDir}/tmdb-${batchNum}.json`,
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

  console.log('done')
}

main()
