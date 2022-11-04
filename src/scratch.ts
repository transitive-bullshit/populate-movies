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
      language: 'en',
      NOT: {
        OR: [
          {
            countriesOfOrigin: {
              equals: ['India']
            }
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

  // for (const movie of res) {
  //   const m = imdbMovies[movie.imdbId]

  //   // ;(movie as any).genres2 = m.genres
  // }

  console.warn(res.length)
  // // console.log(res)
  console.log(JSON.stringify(res, null, 2))
}

main()
