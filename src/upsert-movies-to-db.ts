import fs from 'node:fs/promises'

import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { prisma } from './lib/db'

/**
 * Upserts all movies downloaded on disk into our Prisma database.
 *
 * @note The batch create version is ~14x faster than the upsert version, so it's
 * the default. (~30s vs ~7 minutes)
 */
async function main() {
  const dropMovies = !process.env.NO_DROP_MOVIES
  if (dropMovies) {
    console.log('dropping movies from db')
    await prisma.movie.deleteMany()
  }

  let batchNum = 0
  let numMoviesTotal = 0
  let numMoviesUpsertedTotal = 0

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies: types.Movie[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    console.log(
      `\nupserting ${movies.length} movies in batch ${batchNum} (${srcFile})\n`
    )

    let numMoviesUpserted = 0

    if (dropMovies) {
      const insertBatchSize = 512
      const numInsertBatches = Math.ceil(movies.length / insertBatchSize)
      const batches = []

      for (let i = 0; i < numInsertBatches; ++i) {
        batches.push(i)
      }

      await pMap(
        batches,
        async (_, index) => {
          const start = index * insertBatchSize
          const end = start + insertBatchSize
          const movieBatch = movies.slice(start, end)

          console.log(
            `${batchNum}:${index} inserting ${movieBatch.length} movies`
          )

          try {
            const res = await prisma.movie.createMany({
              data: movieBatch
            })

            numMoviesUpserted += res.count
          } catch (err) {
            console.error(`${batchNum}:${index} insert error`, err)
          }
        },
        {
          concurrency: 8
        }
      )
    } else {
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

      numMoviesUpserted += upsertedMovies.length
    }

    numMoviesTotal += movies.length
    numMoviesUpsertedTotal += numMoviesUpserted

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies: movies.length,
      numMoviesUpserted,
      percenMoviesUpserted: `${
        ((numMoviesUpserted / movies.length) * 100) | 0
      }%`
    })
    console.log()

    ++batchNum
  } while (batchNum < config.numBatches)

  console.log('done', {
    numMoviesTotal,
    numMoviesUpsertedTotal,
    percenMoviesUpsertedTotal: `${
      ((numMoviesUpsertedTotal / numMoviesTotal) * 100) | 0
    }%`
  })
}

main()
