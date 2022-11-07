import fs from 'node:fs/promises'

import makeDir from 'make-dir'

import * as config from './lib/config'
import * as types from './types'
import { fetchAllFlickMetrixMovies } from './lib/flick-metrix'

/**
 * Fetches all movies from flickmetrix.com's private API and stores the results
 * as JSON in a local cache.
 *
 * This should be ~70k movies.
 */
async function main() {
  await makeDir(config.outDir)

  const movies = await fetchAllFlickMetrixMovies()

  const flickMetrixMovies: types.FlickMetrixMovies = {}
  for (const movie of movies) {
    flickMetrixMovies[movie.imdbID] = movie
  }

  await fs.writeFile(
    config.flickMetrixMoviesPath,
    JSON.stringify(flickMetrixMovies, null, 2),
    { encoding: 'utf-8' }
  )

  console.warn('\ndone', {
    numMovies: Object.keys(flickMetrixMovies).length
  })
}

main()
