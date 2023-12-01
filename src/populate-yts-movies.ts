import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { getNumBatches } from './lib/utils'
import { YTS } from './lib/yts'

/**
 * Fetches info on all previously downloaded movies from YTS.
 *
 * @example
 * ```
 * npx tsx src/populate-yts-movies.ts
 * ```
 */
async function main() {
  const yts = new YTS()
  await makeDir(config.outDir)

  const numBatches = await getNumBatches()

  let batchNum = 0
  let numMoviesTotal = 0
  let numYTSMoviesDownloadedTotal = 0

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies: types.Movie[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    console.log(
      `\npopulating ${movies.length} movies in batch ${batchNum} (${srcFile})\n`
    )

    let numDownloaded = 0

    await pMap(
      movies,
      async (movie, index): Promise<types.yts.Movie | null> => {
        if (!movie.imdbId) {
          return null
        }

        try {
          console.log(
            `${batchNum}:${index} yts ${movie.imdbId} (${movie.releaseYear}) ${movie.title}`
          )

          const ytsMovie = await yts.getMovie({ imdbId: movie.imdbId })

          ++numDownloaded

          if (numDownloaded === 1 || numDownloaded % 50 === 0) {
            console.log()
            console.log(JSON.stringify(ytsMovie, null, 2))
            console.log()
          }

          return
        } catch (err) {
          console.error('yts error', movie.imdbId, movie.title, err.toString())

          const statusCode = err.response?.statusCode
          if (statusCode === 404) {
            return null
          }
        }
      },
      {
        concurrency: 16
      }
    )

    const numMovies = movies.length
    const numYTSMoviesDownloaded = numDownloaded

    numMoviesTotal += numMovies
    numYTSMoviesDownloadedTotal += numYTSMoviesDownloaded

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies,
      numYTSMoviesDownloaded,
      numYTSMoviesDownloadedTotal
    })

    ++batchNum
  } while (batchNum < numBatches)

  console.log()
  console.log('done', {
    numMoviesTotal,
    numYTSMoviesDownloadedTotal
  })
}

main()
