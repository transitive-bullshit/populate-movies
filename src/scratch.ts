import './lib/config'
import { prisma } from './lib/db'
import { loadIMDBMoviesFromCache } from './lib/imdb'

/**
 * Misc script for running random prisma queries.
 */
async function main() {
  const imdbMovies = await loadIMDBMoviesFromCache()

  // const res = await prisma.movie.findMany({
  //   where: {
  //     genres: {
  //       has: 'stand up'
  //     }
  //   }
  // })
  // console.warn(res.length)
  // console.log(JSON.stringify(res, null, 2))

  // const res = await prisma.movie.findUnique({
  //   where: {
  //     tmdbId: 118
  //   }
  // })
  // console.log(JSON.stringify(res, null, 2))

  const res = await prisma.movie.findMany({
    where: {
      imdbRating: {
        gte: 8
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
        countriesOfOrigin: {
          equals: ['India']
        },
        genres: {
          has: 'stand up'
        }
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
