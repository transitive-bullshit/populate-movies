import { getTitleDetailsByIMDBId } from './lib/imdb'

/**
 * Quick utility to scrape an individual IMDB title's information.
 */
async function main() {
  const imdbId = 'tt0111161' // movie (shawshank redemption)
  // const imdbId = 'tt1502370' // tv series episode
  // const imdbId = 'tt0282267' // tv special
  // const imdbId = 'tt0000041' // short
  // const imdbId = 'tt0025509' // tv mini series
  // const imdbId = 'tt0903747' // tv series (breaking bad)
  const imdbMovie = await getTitleDetailsByIMDBId(imdbId)
  console.log(JSON.stringify(imdbMovie, null, 2))
}

main()
