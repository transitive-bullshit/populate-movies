import fs from 'node:fs/promises'

import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { getTitleDetailsByIMDBId, loadIMDBMoviesFromCache } from './lib/imdb'

/**
 * Fetches info on all previously downloaded movies on IMDB using a cheerio-based
 * scraper called `movier`.
 *
 * Note that we strictly rate limit IMDB access in order to prevent IMDB 503s and
 * IP blacklisting. This results in this script taking hours / days to run fully.
 * In the future, a more sophisticated distributed scraping method would be
 * preferred.
 */
async function main() {
  await makeDir(config.outDir)

  const imdbMovies = await loadIMDBMoviesFromCache()

  let batchNum = 0
  let numMovies = 0

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies: types.Movie[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    const imdbOutputMovies = (
      await pMap(
        movies,
        async (movie, index): Promise<types.Movie> => {
          try {
            if (!movie.imdbId || imdbMovies[movie.imdbId]) {
              return null
            }

            if (movie.runtime < 30) {
              return null
            }

            console.log(
              `${index} imdb ${movie.imdbId} (${movie.status}) ${movie.title}`
            )
            const imdbMovie = await getTitleDetailsByIMDBId(movie.imdbId)
            imdbMovies[movie.imdbId] = imdbMovie

            if (imdbMovie.mainRate.rateSource?.toLowerCase() === 'imdb') {
              movie.imdbRating = imdbMovie.mainRate.rate
              movie.imdbVotes = imdbMovie.mainRate.votesCount
            }

            // console.log(movie)
            // console.log(imdbMovie)
          } catch (err) {
            console.error('imdb error', movie.imdbId, err)
          }

          return movie
        },
        {
          concurrency: 4
        }
      )
    ).filter(Boolean)

    numMovies += movies.length
    console.log()
    console.log(`batch ${batchNum} done`, {
      numMovies,
      numIMDBMovies: Object.keys(imdbMovies).length
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
    numMovies,
    numIMDBMovies: Object.keys(imdbMovies).length
  })
}

main()
