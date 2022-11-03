import fs from 'node:fs/promises'

import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'

/**
 * Upserts all movies downloaded on disk into our Prisma database.
 */
async function main() {
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
          console.log(`${batchNum}:${index}) ${movie.imdbId} ${movie.title}`)

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
      numMovies: movies.length
    })

    ++batchNum
  } while (batchNum < config.numBatches)

  console.log('done')
}

main()
