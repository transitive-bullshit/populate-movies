import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { getTitleDetailsByIMDBId, loadIMDBMoviesFromCache } from './lib/imdb'

/**
 * Fetches info on all previously downloaded movies from IMDB using a cheerio-based
 * scraper called `movier`.
 *
 * Note that we strictly rate limit IMDB access in order to prevent IMDB 503s and
 * IP blacklisting. This results in this script taking hours / days to run fully.
 * In the future, a more sophisticated distributed scraping method would be
 * preferred.
 *
 * @example
 * ```
 * IGNORE_EXISTING_IMDB_MOVIES=true time npx tsx src/populate-imdb-movies.ts
 * ```
 */
async function main() {
  const ignoreExistingIMDBMovies = !!process.env.IGNORE_EXISTING_IMDB_MOVIES
  await makeDir(config.outDir)

  const imdbMovies = await loadIMDBMoviesFromCache()

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

    let firstMovieInBatch = true
    const imdbOutputMovies = (
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

          if (ignoreExistingIMDBMovies && imdbMovies[movie.imdbId]) {
            return null
          }

          let numErrors = 0

          while (true) {
            try {
              console.log(
                `${batchNum}:${index} imdb ${movie.imdbId} (${movie.releaseYear}) ${movie.title}`
              )

              const imdbMovie = await getTitleDetailsByIMDBId(movie.imdbId)
              imdbMovies[movie.imdbId] = {
                ...imdbMovies[movie.imdbId],
                ...imdbMovie
              }

              if (firstMovieInBatch) {
                firstMovieInBatch = false
                console.log()
                console.log(JSON.stringify(imdbMovies[movie.imdbId], null, 2))
                console.log()
              }

              // console.log(movie)
              // console.log(imdbMovie)

              return imdbMovies[movie.imdbId]
            } catch (err) {
              console.error(
                'imdb error',
                movie.imdbId,
                movie.title,
                err.toString()
              )

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
    ).filter(Boolean)

    const numMovies = movies.length
    const numIMDBMoviesDownloaded = imdbOutputMovies.length

    numMoviesTotal += numMovies
    numIMDBMoviesDownloadedTotal += numIMDBMoviesDownloaded

    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies,
      numIMDBMoviesDownloaded,
      numIMDBMoviesTotal: Object.keys(imdbMovies).length
    })

    await fs.writeFile(
      config.imdbMoviesPath,
      JSON.stringify(imdbMovies, null, 2),
      { encoding: 'utf-8' }
    )

    ++batchNum
  } while (batchNum < config.numBatches)

  console.log()
  console.log('done', {
    numMoviesTotal,
    numIMDBMoviesDownloadedTotal,
    numIMDBMoviesTotal: Object.keys(imdbMovies).length
  })
}

main()
