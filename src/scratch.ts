import './lib/config'
import { prisma } from './lib/db'

// import { loadIMDBMoviesFromCache } from './lib/imdb'

/**
 * Misc script for running random prisma queries.
 */
async function main() {
  // const imdbMovies = await loadIMDBMoviesFromCache()

  // const res = await prisma.movie.findMany({
  //   where: {
  //     keywords: {
  //       has: 'live performance'
  //     }
  //   }
  // })
  // console.log(JSON.stringify(res, null, 2))

  // const res = await prisma.movie.findUnique({
  //   where: {
  //     imdbId: 'tt0130827'
  //   }
  // })
  // console.log(JSON.stringify(res, null, 2))

  // my extremely subjective query for "quality" movies that I might be interested in
  const res = await prisma.movie.findMany({
    where: {
      imdbRating: {
        gte: 7
      },
      releaseYear: {
        gte: 1985
      },
      runtime: {
        gte: 60
      },
      imdbVotes: {
        gte: 1000
      },
      // language: 'en',
      NOT: {
        OR: [
          {
            title: {
              startsWith: 'National Theatre Live'
            }
          },
          {
            countriesOfOrigin: {
              hasSome: ['India', 'Bangladesh', 'Pakistan', 'Indonesia']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Romania']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Serbia']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Iran']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['China']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Hong Kong']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['China', 'Hong Kong']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Nepal']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Turkey']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Lithuania']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Federal Republic of Yugoslavia']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Egypt']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Bulgaria']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Malaysia']
            }
          },
          {
            countriesOfOrigin: {
              equals: ['Greece']
            }
          },
          {
            languages: {
              equals: ['Romanian']
            }
          },
          {
            languages: {
              equals: ['Persian']
            }
          },
          {
            languages: {
              equals: ['Arabic']
            }
          },
          {
            languages: {
              equals: ['Urdu']
            }
          },
          {
            languages: {
              equals: ['Mandarin']
            }
          },
          {
            languages: {
              equals: ['Hungarian']
            }
          },
          {
            languages: {
              equals: ['Bosnian']
            }
          },
          {
            language: 'kr'
          },
          {
            language: 'ka'
          },
          {
            genres: {
              hasSome: ['stand up', 'documentary', 'short']
            }
          }
        ]
      }
    },
    orderBy: {
      imdbRating: 'desc'
    }
  })

  // filter korean movies aside from Parasite? and the handmaiden?

  // for (const movie of res) {
  //   const m = imdbMovies[movie.imdbId]

  //   // ;(movie as any).genres2 = m.genres
  // }

  console.warn(res.length)
  // // console.log(res)
  console.log(JSON.stringify(res, null, 2))
}

main()
