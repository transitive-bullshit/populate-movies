import fs from 'node:fs/promises'

import makeDir from 'make-dir'

import * as config from './lib/config'
import { fetchAllWikidataMovies } from './lib/wikidata'

/**
 * Fetches info on all Wikidata movies that have valid IMDB IDs and
 * rotten tomato links (~73k movies as of this commit).
 *
 * @example
 * ```
 * npx tsx src/populate-wikidata-movies.ts
 * ```
 */
async function main() {
  await makeDir(config.outDir)

  const wikidataMovies = await fetchAllWikidataMovies()

  await fs.writeFile(
    config.wikidataMoviesPath,
    JSON.stringify(wikidataMovies, null, 2),
    {
      encoding: 'utf-8'
    }
  )
}

main()
