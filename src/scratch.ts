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
      foreign: false,
      imdbRating: {
        gte: 6
      },
      rtAudienceRating: {
        not: null
      },
      rtCriticRating: {
        not: null
      }
    },
    select: {
      // imdbRating: true,
      // imdbVotes: true
      // rtAudienceRating: true,
      // rtCriticRating: true
      // tmdbVotes: true,
    },
    orderBy: {
      rtAudienceRating: 'desc'
    }
  })

  console.warn(res.length)
  console.log(JSON.stringify(res, null, 2))
}

main()
