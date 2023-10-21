import { getWikidataMovies } from './lib/wikidata'

/**
 * Quick utility to fetch an individual Wikidata movie entity.
 */
async function main() {
  // const entityId = 'Q849162' // event horizon
  // const entityId = 'Q44578' // the titanic
  const entityId = 'Q182218' // the avengers

  const [movie] = await getWikidataMovies(entityId)

  console.log(JSON.stringify(movie, null, 2))
}

main()
