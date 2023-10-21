import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { getNumBatches } from './lib/utils'
import {
  getWikidataEntities,
  loadWikidataMoviesFromCache
} from './lib/wikidata'

/**
 * Fetches info on all previously downloaded movies from Wikidata.
 *
 * @TODO we can batch up to 50 movies per request
 * @TODO handle rate-limiting
 *
 * @example
 * ```
 * npx tsx src/populate-wikidata-movies.ts
 * FORCE=true npx tsx src/populate-rt-movies.ts
 * ```
 */
async function main() {
  const force = !!process.env.FORCE
  await makeDir(config.outDir)

  const [wikidataMovies, numBatches] = await Promise.all([
    loadWikidataMoviesFromCache(),
    getNumBatches()
  ])

  let batchNum = 0
  let numMoviesTotal = 0
  let numWikidataMoviesDownloadedTotal = 0
  let isRateLimited = false

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies = (
      JSON.parse(
        await fs.readFile(srcFile, { encoding: 'utf-8' })
      ) as types.Movie[]
    ).filter((movie) => movie.wikidataId)

    console.warn(
      `\npopulating ${movies.length} movies in batch ${batchNum} (${srcFile})\n`
    )

    let numDownloaded = 0

    const outputMovies = (
      await pMap(
        movies,
        async (movie, index): Promise<Partial<types.Movie> | null> => {
          if (!force && wikidataMovies[movie.tmdbId]) {
            return null
          }

          if (!movie.wikidataId) {
            return null
          }

          if (isRateLimited) {
            // TODO: handle rate limits more gracefully...
            // pause for 5 minutes
            await delay(5 * 60000)
          }

          try {
            console.warn(
              `${batchNum}:${index}`,
              'wikidata',
              movie.tmdbId,
              movie.title,
              `(${movie.releaseYear})`,
              `https://www.wikidata.org/wiki/${movie.wikidataId}`
            )

            const [wikidataMovie] = await getWikidataEntities(movie.wikidataId)
            const result = (wikidataMovies[movie.tmdbId] = {
              ...wikidataMovies[movie.tmdbId],
              ...wikidataMovie
            })

            isRateLimited = false

            console.log(JSON.stringify(result, null, 2))

            if (++numDownloaded % 10 === 0) {
              await fs.writeFile(
                config.wikidataMoviesPath,
                JSON.stringify(wikidataMovies, null, 2),
                {
                  encoding: 'utf-8'
                }
              )
            }

            return result
          } catch (err) {
            console.error(
              `${batchNum}:${index}`,
              'wikidata error',
              movie.tmdbId,
              movie.title,
              `https://www.wikidata.org/wiki/${movie.wikidataId}`,
              err.toString()
            )

            const statusCode = err.response?.statusCode

            if (statusCode === 429) {
              isRateLimited = true
            }

            return null
          }
        },
        {
          concurrency: 16
        }
      )
    ).filter(Boolean)

    const numMovies = movies.length
    const numWikidataMoviesDownloaded = outputMovies.length

    numMoviesTotal += numMovies
    numWikidataMoviesDownloadedTotal += numWikidataMoviesDownloaded

    console.warn()
    console.warn(`batch ${batchNum} done`, {
      numMovies,
      numWikidataMoviesDownloaded,
      numWikidataMoviesTotal: Object.keys(wikidataMovies).length
    })

    await fs.writeFile(
      config.wikidataMoviesPath,
      JSON.stringify(wikidataMovies, null, 2),
      {
        encoding: 'utf-8'
      }
    )

    ++batchNum
  } while (batchNum < numBatches)

  console.warn()
  console.warn('done', {
    numMoviesTotal,
    numWikidataMoviesDownloadedTotal,
    numWikidataMoviesTotal: Object.keys(wikidataMovies).length
  })
}

main()
