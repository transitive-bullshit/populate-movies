import fs from 'node:fs/promises'

import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { prisma } from './lib/db'

/**
 * Upserts all movies downloaded on disk into our Prisma database.
 */
async function main() {
  let batchNum = 0
  let numMoviesTotal = 0
  let numMoviesUpsertedTotal = 0

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies: types.Movie[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    const upsertedMovies = (
      await pMap(
        movies,
        async (movie, index) => {
          try {
            console.log(
              `${batchNum}:${index}) ${movie.tmdbId} ${movie.imdbId} ${movie.title}`
            )

            return await prisma.movie.upsert({
              where: { tmdbId: movie.tmdbId },
              create: movie,
              update: movie
            })
          } catch (err) {
            console.error(
              'upsert error',
              movie.tmdbId,
              movie.imdbId,
              movie.title,
              err
            )
          }
        },
        {
          concurrency: 16
        }
      )
    ).filter(Boolean)

    numMoviesTotal += movies.length
    numMoviesUpsertedTotal += upsertedMovies.length

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies: movies.length,
      numUpsertedMovies: upsertedMovies.length,
      percenUpsertedtMovies: `${
        ((upsertedMovies.length / movies.length) * 100) | 0
      }%`
    })
    console.log()

    ++batchNum
  } while (batchNum < config.numBatches)

  console.log('done', {
    numMoviesTotal,
    numMoviesUpsertedTotal,
    percenUpsertedtMoviesTotal: `${
      ((numMoviesUpsertedTotal / numMoviesTotal) * 100) | 0
    }%`
  })
}

main()
