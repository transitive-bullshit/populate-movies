import fs from 'node:fs/promises'

import got from 'got'
import pMap from 'p-map'
import pThrottle from 'p-throttle'
// @ts-ignore
import wdk from 'wikibase-sdk/wikidata.org'

import * as types from '../types'
import * as config from './config'

// P345 IMDB ID
// P1258 RT ID
// P1712 Metacritic ID
// P2061 AllMovie movie ID
// P6127 Letterboxd film ID
// P11137 Reddit topic ID
// P4947 TMDB movie ID
// P8013 Trakt.tv ID
// P1651 YouTube video ID
// P2671 Google Knowledge Graph ID
// P1874 Netflix ID
// P6466 Hulu movie ID
// P6467 Hulu series ID
// P8055 Amazon Prime Video ID
// P8298 HBO Max ID
// P7595 Disney+ movie ID
// P7596 Disney+ series ID
// P9586 Apple TV+ movie ID
// P9751 Apple TV show ID
// P6552 Twitter numeric user ID
// P2002 Twitter username

// P444 review score
// P447 review score by (qualifier)
// P585 point in time (qualifier)
// P459 determination method (qualifier)
// P7887 number of reviews/ratings (qualifier)

// Q106515043 Metascore
// Q108403393 Rotten Tomatoes Tomatometer Score
// Q108403540 Rotten Tomatoes Audience Score
// Q80698083 Critics review
// Q105584 Rotten Tomatoes

const wikidataEntityToMpaaRating: Record<string, string> = {
  Q23660208: 'G',
  Q18665334: 'PG',
  Q18665339: 'PG-13',
  Q18665344: 'R',
  Q18665349: 'NC-17',
  Q29841070: 'M',
  Q47274658: 'X',
  Q29841078: 'GP'
}

const wikidataUserAgent =
  'populate-movies/0.0 (https://github.com/transitive-bullshit/populate-movies)'

/**
 * Rate-limit HTTP requests to Rotten Tomatoes.
 */
const throttle = pThrottle({
  limit: 100,
  interval: 1000
})

export const getWikidataMovies = throttle(getWikidataMoviesImpl)

export async function fetchAllWikidataMovies({
  languages = ['en']
}: {
  languages?: string[]
} = {}) {
  const movies: types.WikidataMovies = {}
  const limit = 500
  let offset = 0

  do {
    try {
      // find all entities which are films and have both an IMDB id
      // and a rotten tomatoes id
      const url = wdk.sparqlQuery(`
      SELECT DISTINCT ?item WHERE {
        ?item p:P31 ?statement0.
        ?statement0 (ps:P31/(wdt:P279*)) wd:Q11424.
        ?item p:P345 ?statement1.
        ?statement1 (ps:P345) _:anyValueP345.
        ?item p:P1258 ?statement2.
        ?statement2 (ps:P1258) _:anyValueP1258.
      }
      LIMIT ${limit}
      OFFSET ${offset}
    `)
      console.log('wikidata search', offset, '>>>', url)

      const res = await got(url, {
        headers: {
          'user-agent': wikidataUserAgent
        }
      }).json<any>()

      const ids = wdk.simplify.sparqlResults(res, { minimize: true })
      console.log('wikidata search', offset, '<<<', ids.length)
      if (!ids.length) break

      const moviesBatch = await getWikidataMovies(ids, { languages })
      for (const movie of moviesBatch) {
        if (movie.imdbId) {
          movies[movie.imdbId] = movie
        }
      }
    } catch (err) {
      console.error('wikidata search error', offset, err.toString())
    }

    offset += limit

    // this approach has a hard offset limit of 10k imposed by wikidata
    // // find all films which have both an IMDB id and a rotten tomatoes id
    // const url = wdk.cirrusSearchPages({
    //   search: query,
    //     // TODO: this doesn't support children of Q11424 films (like unfinished films)
    //   haswbstatement: ['P31=Q11424', 'P345', 'P1258'],
    //   limit,
    //   offset
    // })

    // console.log('wikidata search', offset, url)
    // const res = await got(url).json<any>()
    // if (res.error) {
    //   console.error('wikidata search error', res.error)
    //   break
    // }

    // total = res.query.searchinfo.totalhits
    // offset += limit

    // const ids = res.query.search.map((result: any) => result.title)
  } while (true)

  return movies
}

export async function getWikidataMoviesImpl(
  ids: string | string[],
  {
    languages = ['en']
  }: {
    languages?: string[]
  } = {}
) {
  ids = Array.isArray(ids) ? ids : [ids]

  const maxBatchSize = 50
  let batches: string[][] = []

  if (ids.length <= maxBatchSize) {
    batches = [ids]
  } else {
    const numBatches = Math.ceil(ids.length / maxBatchSize)
    for (let i = 0; i < numBatches; ++i) {
      batches.push(ids.slice(i * maxBatchSize, (i + 1) * maxBatchSize))
    }
  }

  const entities = await pMap(
    batches,
    async (batch) => {
      const url = wdk.getEntities({ ids: batch, languages })
      const res = await got(url).json<any>()

      const entities = wdk.simplify.entities(res.entities, {
        keepQualifiers: true,
        keepReferences: true
      })

      return Object.values(entities)
        .map(convertSimplifiedWikidataEntityToMovie)
        .filter(Boolean)
    },
    { concurrency: 10 }
  )

  return entities.flat()
}

/**
 * Converts a simplified wikidata entity to a partial movie.
 */
function convertSimplifiedWikidataEntityToMovie(
  entity: types.wikidata.SimplifiedEntity
): Partial<types.Movie> | null {
  const movie: Partial<types.Movie> = {
    wikidataId: entity.id,
    title: entity.labels?.en
  }

  const entityInstanceType = entity.claims.P31?.[0]?.value
  if (entityInstanceType !== 'Q11424' && entityInstanceType !== 'Q18011172') {
    // entity is not a film or a film project (unfinished film)

    // TODO: ensure this doesn't lead to false negatives
    return null
  }

  const reviews = entity.claims.P444

  if (reviews) {
    for (const review of reviews) {
      if (review.value === undefined) {
        continue
      }

      const numReviews = review.qualifiers.P7887?.[0] as number
      const determinationMethod = review.qualifiers.P459?.[0]

      switch (determinationMethod) {
        case 'Q108403393': {
          // Rotten Tomatoes Tomatometer Score
          // parse "29%"
          const value = parseInt(review.value.replace(/[^\d]/g, '').trim(), 10)

          if (numReviews !== undefined && numReviews >= 0) {
            movie.rtCriticVotes = numReviews
          }

          if (!isNaN(value) && value >= 0) {
            movie.rtCriticRating = value
          }
          break
        }

        case 'Q108403540': {
          // Rotten Tomatoes Audience Score

          // parse "5/10"
          const value = 10 * parseFloat(review.value.split('/')[0].trim())

          if (numReviews !== undefined && numReviews >= 0) {
            movie.rtAudienceVotes = numReviews
          }

          if (!isNaN(value) && value >= 0) {
            movie.rtAudienceRating = value
          }
          break
        }

        case 'Q106515043': {
          // Metascore

          // parse "35/100"
          const value = parseInt(review.value.split('/')[0].trim(), 10)

          if (numReviews !== undefined && numReviews >= 0) {
            movie.metacriticVotes = numReviews
          }

          if (!isNaN(value) && value >= 0) {
            movie.metacriticRating = value
          }
          break
        }

        // default:
        //   console.warn('warn unhandled review', JSON.stringify(review, null, 2))
        //   break
      }

      for (const reference of review.references) {
        if (reference.P1258?.[0]) {
          movie.rtUrl = `https://www.rottentomatoes.com/${reference.P1258?.[0]}`
        }
      }
    }
  }

  const optionalFields: Array<{
    property: string
    field: string
    transform?: (value: string | number) => string
    filter?: (claims: types.wikidata.Claim[]) => types.wikidata.Claim[]
  }> = [
    {
      property: 'P345',
      field: 'imdbId'
    },
    {
      property: 'P1874',
      field: 'netflixId'
    },
    {
      property: 'P6466',
      field: 'huluId'
    },
    {
      property: 'P6467',
      field: 'huluId'
    },
    {
      property: 'P8055',
      field: 'amazonId'
    },
    {
      property: 'P9586',
      field: 'appleTVId'
    },
    {
      property: 'P9751',
      field: 'appleTVId'
    },
    {
      property: 'P2002',
      field: 'twitterUsername'
    },
    {
      property: 'P6552',
      field: 'twitterId'
    },
    {
      property: 'P2671',
      field: 'googleKGId'
    },
    {
      property: 'P8013',
      field: 'traktTVId'
    },
    {
      property: 'P11137',
      field: 'redditTopicId'
    },
    {
      property: 'P6127',
      field: 'letterboxdId'
    },
    {
      property: 'P1712',
      field: 'metacriticId'
    },
    {
      property: 'P2061',
      field: 'allMovieId'
    },
    {
      property: 'P7595',
      field: 'disneyPlusId'
    },
    {
      property: 'P7596',
      field: 'disneyPlusId'
    },
    {
      property: 'P8298',
      field: 'hboMaxId'
    },
    {
      property: 'P1258',
      field: 'rtUrl',
      transform: (value: string | number) =>
        `https://www.rottentomatoes.com/${value}`
    },
    {
      property: 'P2142',
      field: 'revenue',
      filter: (claims: types.wikidata.Claim[]) =>
        claims.filter((claim) => claim.qualifiers.P3005?.[0] === 'Q13780930'),
      transform: (value: string | number) => `${value}`
    },
    {
      property: 'P2130',
      field: 'budget',
      transform: (value: string | number) => `${value}`
    },
    {
      property: 'P1657',
      field: 'mpaaRating',
      transform: (value: string | number) => wikidataEntityToMpaaRating[value]
    },
    {
      property: 'P2047',
      field: 'runtime'
    },
    {
      property: 'P856',
      field: 'homepage'
    }
  ]

  for (const optionalField of optionalFields) {
    const claims0 = entity.claims[optionalField.property]
    const claims = optionalField.filter
      ? claims0 && optionalField.filter(claims0)
      : claims0
    const value = claims?.[0]?.value
    const transformedValue = optionalField.transform
      ? value && optionalField.transform(value)
      : value

    if (transformedValue) {
      movie[optionalField.field] = transformedValue
    }
  }

  return movie
}

export async function loadWikidataMoviesFromCache(): Promise<types.WikidataMovies> {
  let wikidataMovies: types.WikidataMovies = {}

  try {
    console.log(
      `loading Wikidata movies from cache (${config.wikidataMoviesPath})`
    )

    wikidataMovies = JSON.parse(
      await fs.readFile(config.wikidataMoviesPath, { encoding: 'utf-8' })
    )

    console.warn(
      `loaded ${
        Object.keys(wikidataMovies).length
      } Wikidata movies from cache (${config.wikidataMoviesPath})`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load Wikidata movie cache (${config.wikidataMoviesPath})`,
      err.toString()
    )
    console.warn(
      "You can safely ignore this warning if you haven't run `populate-wikidata-movies.ts`."
    )
  }

  return wikidataMovies
}

export function populateMovieWithWikidataInfo(
  movie: types.Movie,
  { wikidataMovies }: { wikidataMovies?: types.WikidataMovies }
): types.Movie | null {
  if (!wikidataMovies) {
    return movie
  }

  const wikidataMovie = wikidataMovies[movie.imdbId]
  if (!wikidataMovie) {
    return movie
  }

  // for these fields, we want to prioritize the rotten tomatoes values
  const fieldOverrides: types.MovieField[] = ['wikidataId']

  for (const field of fieldOverrides) {
    const value = wikidataMovie[field]

    if (value || value === 0) {
      ;(movie as any)[field] = value
    }
  }

  // for these fields, we want to prioritize values from other sources
  const fieldOptionals: types.MovieField[] = [
    'title',
    'runtime',
    'budget',
    'revenue',
    'mpaaRating',
    'homepage',
    'rtUrl',
    'imdbId',
    'netflixId',
    'huluId',
    'amazonId',
    'appleTVId',
    'twitterId',
    'twitterUsername',
    'googleKGId',
    'traktTVId',
    'redditTopicId',
    'letterboxdId',
    'metacriticId',
    'allMovieId',
    'disneyPlusId',
    'hboMaxId',
    'metacriticRating',
    'metacriticVotes',
    'rtAudienceRating',
    'rtAudienceVotes',
    'rtCriticRating',
    'rtCriticVotes'
  ]

  for (const field of fieldOptionals) {
    if (movie[field]) continue
    const value = wikidataMovie[field]

    if (value || value === 0) {
      ;(movie as any)[field] = value
    }
  }

  return movie
}
