import fs from 'node:fs/promises'

import delay from 'delay'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import './lib/bootstrap-proxy'
import { loadOMDBMoviesFromCache } from './lib/omdb'
import { loadRTMoviesFromCache, scrapeRottenTomatoesInfoByUrl } from './lib/rt'
import { getNumBatches } from './lib/utils'
import { loadWikidataMoviesFromCache } from './lib/wikidata'

/**
 * Fetches info on all previously downloaded movies from Rotten Tomatoes using
 * a cheerio-based scraper.
 *
 * @todo figure out a better mapping from tmdb/imdb IDs => rtUrl
 *
 * @example
 * ```
 * npx tsx src/populate-rt-movies.ts
 * FORCE=true npx tsx src/populate-rt-movies.ts
 * ```
 */
async function main() {
  const force = !!process.env.FORCE
  await makeDir(config.outDir)

  const [rtMovies, omdbMovies, wikidataMovies, numBatches] = await Promise.all([
    loadRTMoviesFromCache(),
    loadOMDBMoviesFromCache(),
    loadWikidataMoviesFromCache(),
    getNumBatches()
  ])

  let batchNum = 0
  let numMoviesTotal = 0
  let numRTMoviesDownloadedTotal = 0

  do {
    const srcFile = `${config.outDir}/movies-${batchNum}.json`
    const movies: types.Movie[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    console.warn(
      `\npopulating ${movies.length} movies in batch ${batchNum} (${srcFile})\n`
    )

    let isRateLimited = false
    let numDownloaded = 0
    let firstMovieInBatch = true

    const rtOutputMovies = (
      await pMap(
        movies,
        async (movie, index): Promise<Partial<types.Movie> | null> => {
          if (!force && rtMovies[movie.tmdbId]) {
            return null
          }

          const tempUrls = [
            movie.rtUrl,
            rtMovies[movie.tmdbId]?.rtUrl,
            movie.imdbId && wikidataMovies[movie.imdbId]?.rtUrl,
            movie.imdbId && omdbMovies[movie.imdbId]?.tomatoURL
          ]
            .filter(Boolean)
            .map((url) => url.trim().replace(/\/+$/g, '').trim())

          const rtUrlsTemp = new Set<string>()
          const rtUrls: string[] = []
          for (const tempUrl of tempUrls) {
            if (!rtUrlsTemp.has(tempUrl)) {
              rtUrlsTemp.add(tempUrl)
              rtUrls.push(tempUrl)
            }
          }

          if (rtUrls.length > 1) {
            console.log(`${batchNum}:${index}`, movie.tmdbId, movie.title, {
              rtUrls
            })
          }

          let numErrors = 0

          while (true) {
            const rtUrl = rtUrls[0]

            if (!rtUrl) {
              return null
            }

            // if (isRateLimited) {
            //   // TODO: handle rate limits more gracefully...
            //   // pause for 10 minutes
            //   await delay(10 * 60000)
            // }

            try {
              console.warn(
                `${batchNum}:${index}`,
                'rt',
                movie.tmdbId,
                movie.title,
                `(${movie.releaseYear})`,
                rtUrl
              )

              const rtMovie = await scrapeRottenTomatoesInfoByUrl(rtUrl)
              const result = (rtMovies[movie.tmdbId] = {
                ...rtMovies[movie.tmdbId],
                ...rtMovie
              })

              isRateLimited = false

              if (firstMovieInBatch) {
                firstMovieInBatch = false
                // console.warn()
                // console.warn(JSON.stringify(result, null, 2))
                // console.warn()
              }
              console.log(JSON.stringify(result, null, 2))

              if (++numDownloaded % 10 === 0) {
                await fs.writeFile(
                  config.rtMoviesPath,
                  JSON.stringify(rtMovies, null, 2),
                  {
                    encoding: 'utf-8'
                  }
                )
              }

              // console.log(movie)
              // console.log(rtMovie)

              return result
            } catch (err) {
              console.error(
                `${batchNum}:${index}`,
                'rt error',
                movie.tmdbId,
                movie.title,
                rtUrl,
                err.toString()
              )

              const statusCode = err.response?.statusCode

              if (statusCode >= 400 && statusCode < 500) {
                if (statusCode === 403) {
                  // TODO: 404s may also be presenting themselves as 403s, but we're not checking the next rtUrl in this case...

                  // 403 is what RT uses for rate limiting
                  isRateLimited = true
                } else if (
                  statusCode === 404 &&
                  rtUrls.length >= 2 &&
                  rtUrl.toLowerCase() !== rtUrls[1].toLowerCase()
                ) {
                  isRateLimited = false
                  // try the next URL if this one is not found
                  console.warn('rt falling back to next rt URL', rtUrls[1])
                  rtUrls.shift()
                  continue
                } else {
                  // unrecoverable error
                  return null
                }
              } else {
                isRateLimited = false
              }

              if (++numErrors >= 3) {
                console.error(movie.tmdbId, 'too many errors')
                return null
              } else {
                console.error('sleeping...')
                await delay(1000 * numErrors * numErrors)
              }
            }
          }
        },
        {
          concurrency: 16
        }
      )
    ).filter(Boolean)

    const numMovies = movies.length
    const numRTMoviesDownloaded = rtOutputMovies.length

    numMoviesTotal += numMovies
    numRTMoviesDownloadedTotal += numRTMoviesDownloaded

    console.warn()
    console.warn(`batch ${batchNum} done`, {
      numMovies,
      numRTMoviesDownloaded,
      numRTMoviesTotal: Object.keys(rtMovies).length
    })

    await fs.writeFile(config.rtMoviesPath, JSON.stringify(rtMovies, null, 2), {
      encoding: 'utf-8'
    })

    ++batchNum
  } while (batchNum < numBatches)

  console.warn()
  console.warn('done', {
    numMoviesTotal,
    numRTMoviesDownloadedTotal,
    numRTMoviesTotal: Object.keys(rtMovies).length
  })
}

main()
