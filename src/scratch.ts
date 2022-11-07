import './lib/config'
import { prisma } from './lib/db'

/**
 * Misc script for running random prisma queries.
 */
async function main() {
  // const res = []
  // const m = await loadIMDBMoviesFromCache()
  // for (let r of Object.values(m)) {
  //   if ((r.mainType as any) === 'tvSpecial') {
  //     res.push(r)
  //   }
  // }
  // res.sort((a, b) => b.mainRate.votesCount - a.mainRate.votesCount)

  const res = await prisma.movie.findMany({
    where: {
      imdbRating: {
        gte: 6
      },
      releaseYear: {
        gte: 1972
      },
      relevancyScore: {
        gte: 31000
      },
      foreign: false,
      NOT: {
        genres: {
          hasSome: ['stand up', 'documentary', 'short']
        }
      }
    },
    select: {
      title: true,
      releaseYear: true,
      releaseDate: true,
      imdbRating: true,
      imdbVotes: true,
      tmdbPopularity: true,
      imdbCustomPopularity: true,
      relevancyScore: true
    },
    orderBy: {
      relevancyScore: 'desc'
    }
  })

  console.warn(res.length)
  console.log(JSON.stringify(res, null, 2))
}

main()
