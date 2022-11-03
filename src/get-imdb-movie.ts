import { getTitleDetailsByIMDBId } from './lib/imdb'

/**
 * Quick utility to scrape an individual IMDB title's information.
 */
async function main() {
  // const imdbId = 'tt1502370'
  const imdbId = 'tt4197538'
  const imdbMovie = await getTitleDetailsByIMDBId(imdbId)
  console.log(JSON.stringify(imdbMovie, null, 2))
}

main()
