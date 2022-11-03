import './lib/config'
import { prisma } from './lib/db'

/**
 * Misc script for running random prisma queries.
 */
async function main() {
  const res = await prisma.movie.findMany({
    where: {
      imdbRating: {
        gte: 9.1
      },
      releaseYear: {
        gte: 1985
      },
      runtime: {
        gte: 60
      },
      imdbVotes: {
        gte: 100
      },
      language: 'en'
    },
    orderBy: {
      imdbRating: 'desc'
    }
  })

  console.log(res)
}

main()
