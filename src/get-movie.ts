import './lib/config'
import { prisma } from './lib/db'

/**
 * Computes the unique genres and keywords across all movies in the database.
 */
async function main() {
  // const imdbId = 'tt0405094' // lives of others
  const imdbId = 'tt1016150'
  const result = await prisma.movie.findUnique({
    where: {
      imdbId
    }
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
