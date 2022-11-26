import fs from 'node:fs/promises'

import { diffString as jsonDiff } from 'json-diff'
import _omit from 'lodash.omit'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { prisma } from './lib/db'
import { dequal } from './lib/dequal'

/**
 * Upserts all movies downloaded on disk into our Prisma database.
 *
 * @note The batch create version is ~14x faster than the upsert version, but it's
 * potentially destructive, so it's not the default. (~30s vs ~7 minutes)
 */
async function main() {
  const dryRun = !!process.env.DRY_RUN
  const dropMovies = !!process.env.DROP_MOVIES
  if (dropMovies && dryRun) {
    console.error('invalid DROP_MOVIES and DRY_RUN')
    return
  }

  if (dropMovies && !dryRun) {
    console.warn('\nWARNING: dropping movies from db\n')
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

    console.warn(
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

          console.warn(
            `${batchNum}:${index} inserting ${movieBatch.length} movies`
          )

          try {
            if (!dryRun) {
              const res = await prisma.movie.createMany({
                data: movieBatch
              })

              numMoviesUpserted += res.count
            }
          } catch (err) {
            console.error(`${batchNum}:${index} batch movie insert error`, err)
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
              console.warn(
                `${batchNum}:${index}) ${movie.tmdbId} ${movie.imdbId} ${movie.title}`
              )

              if (dryRun) {
                const dbMovie = await prisma.movie.findUnique({
                  where: { id: movie.id }
                })

                const ignore = [
                  'createdAt',
                  'updatedAt',
                  'searchL',
                  'relevancyScore',
                  'imdbCustomPopularity',
                  'posterPlaceholderUrl',
                  'backdropPlaceholderUrl'
                ]

                if (!dbMovie) {
                  console.log(
                    `${batchNum}:${index}) ${movie.tmdbId} ${movie.imdbId} ${movie.title} - NEW MOVIE`
                  )
                } else if (
                  dequal(dbMovie, movie, {
                    omit: ignore
                  })
                ) {
                  console.log(
                    `${batchNum}:${index}) ${movie.tmdbId} ${movie.imdbId} ${movie.title} - NO CHANGE`
                  )
                } else {
                  console.log(
                    `${batchNum}:${index}) ${movie.tmdbId} ${movie.imdbId} ${movie.title}\n`,
                    jsonDiff(_omit(dbMovie, ignore), _omit(movie, ignore))
                  )
                }

                return true
              } else {
                return await prisma.movie.upsert({
                  where: { id: movie.id },
                  create: movie,
                  update: movie
                })
              }
            } catch (err) {
              console.error(
                'movie upsert error',
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

    console.warn()
    console.warn(`batch ${batchNum} done`, {
      numMovies: movies.length,
      numMoviesUpserted,
      percenMoviesUpserted: `${
        ((numMoviesUpserted / movies.length) * 100) | 0
      }%`
    })
    console.warn()

    ++batchNum
  } while (batchNum < config.numBatches)

  console.warn('done', {
    numMoviesTotal,
    numMoviesUpsertedTotal,
    percenMoviesUpsertedTotal: `${
      ((numMoviesUpsertedTotal / numMoviesTotal) * 100) | 0
    }%`
  })
}

main()
