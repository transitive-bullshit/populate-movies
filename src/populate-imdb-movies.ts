import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { getTitleDetailsByIMDBId, loadIMDBMoviesDB } from './lib/imdb'
import { getNumBatches } from './lib/utils'

/**
 * Fetches info on all previously downloaded movies from IMDB using a cheerio-based
 * scraper called `movier`.
 *
 * Note that we strictly rate limit IMDB access in order to prevent IMDB 503s and
 * IP blacklisting. This results in this script taking hours / days to run fully.
 * In the future, a more sophisticated distributed scraping method would be
 * preferred.
 *
 * @TODO movier is using hard-coded headers for cookie and user-agent.
 *
 * @example
 * ```
 * npx tsx src/populate-imdb-movies.ts
 * FORCE=true time npx tsx src/populate-imdb-movies.ts
 * ```
 */
async function main() {
  const force = !!process.env.FORCE
  await makeDir(config.outDir)

  const numBatches = await getNumBatches()
  const imdbMoviesDb = await loadIMDBMoviesDB()

  let batchNum = 0
  let numMoviesTotal = 0
  let numIMDBMoviesDownloadedTotal = 0

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
      async (movie, index): Promise<types.imdb.Movie | null> => {
        if (!movie.imdbId) {
          return null
        }

        // filter out movies which are too short like shorts, tv episodes, specials,
        // and art projects
        if (movie.runtime < 30) {
          return null
        }

        let existingIMDBMovie: types.imdb.Movie
        try {
          existingIMDBMovie = await imdbMoviesDb.get(movie.imdbId)
        } catch (err) {
          if (err.code !== 'LEVEL_NOT_FOUND') {
            console.error('imdb error unexpected leveldb', err.toString())
          }
        }

        if (!force && existingIMDBMovie) {
          return null
        }

        let numErrors = 0

        while (true) {
          try {
            console.log(
              `${batchNum}:${index} imdb ${movie.imdbId} (${movie.releaseYear}) ${movie.title}`
            )

            const imdbMovie = await getTitleDetailsByIMDBId(movie.imdbId)

            const result: types.imdb.Movie = {
              ...existingIMDBMovie,
              ...imdbMovie
            }

            // remove extra fields that we're not using (optional)
            // delete result.otherNames
            // delete result.directors
            // delete result.writers
            // delete result.producers
            // delete result.casts
            // delete result.posterImage
            // delete result.allImages
            // delete result.goofs
            // delete result.quotes
            // delete result.taglines
            // delete result.productionCompanies
            // delete result.awards
            // delete result.awardsSummary
            // delete result.dates
            // delete result.allReleaseDates

            await imdbMoviesDb.put(movie.imdbId, result)
            ++numDownloaded

            if (numDownloaded === 1 || numDownloaded % 50 === 0) {
              console.log()
              console.log(JSON.stringify(result, null, 2))
              console.log()
            }

            return
          } catch (err) {
            console.error(
              'imdb error',
              movie.imdbId,
              movie.title,
              err.toString(),
              err
            )

            const statusCode = err.response?.statusCode
            if (statusCode === 404) {
              return null
            }

            if (++numErrors >= 3) {
              return null
            } else {
              await delay(10000 + 1000 * numErrors * numErrors)
            }
          }
        }
      },
      {
        concurrency: 4
      }
    )

    const numMovies = movies.length
    const numIMDBMoviesDownloaded = numDownloaded

    numMoviesTotal += numMovies
    numIMDBMoviesDownloadedTotal += numIMDBMoviesDownloaded

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies,
      numIMDBMoviesDownloaded
    })

    ++batchNum
  } while (batchNum < numBatches)

  console.log()
  console.log('done', {
    numMoviesTotal,
    numIMDBMoviesDownloadedTotal
  })

  await imdbMoviesDb.close()
}

main()
