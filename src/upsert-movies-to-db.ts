import fs from 'node:fs/promises'

import dotenv from 'dotenv-safe'
import pMap from 'p-map'

import * as types from './types'

dotenv.config()

/**
 * Upserts all movies downloaded on disk as JSON batches into our Prisma database.
 */
async function main() {
  const srcDir = 'out'

  const imdbMoviesPath = `${srcDir}/imdb-movies-2.json`
  const imdbMovies: types.IMDBMovies = JSON.parse(
    await fs.readFile(imdbMoviesPath, { encoding: 'utf-8' })
  )

  const numBatches = 24
  let batchNum = 0

  do {
    const srcFile = `${srcDir}/movies-${batchNum}.json`
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
  } while (batchNum < numBatches)

  console.log('done')
}

main()
