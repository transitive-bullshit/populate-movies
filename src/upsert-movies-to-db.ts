import fs from 'node:fs/promises'

import dotenv from 'dotenv-safe'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { loadIMDBMoviesFromCache } from './lib/imdb'

dotenv.config()

/**
 * Upserts all movies downloaded on disk as JSON batches into our Prisma database.
 */
async function main() {
  const imdbMovies = await loadIMDBMoviesFromCache()

  let batchNum = 0

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies: types.Movie[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    await pMap(
      movies,
      async (movie, index) => {
        try {
          console.log(
            `${batchNum}:${index}) imdb ${movie.imdbId} ${movie.title}`
          )

          if (movie.imdbId && imdbMovies[movie.imdbId]) {
            const imdbMovie = imdbMovies[movie.imdbId]
          }

          // console.log(movie)
          // console.log(imdbMovie)
        } catch (err) {
          console.error('imdb error', movie.imdbId, err)
        }
      },
      {
        concurrency: 4
      }
    )

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies: movies.length,
      numIMDBMovies: Object.keys(imdbMovies).length
    })

    ++batchNum
  } while (batchNum < config.numBatches)

  console.log('done')
}

main()
