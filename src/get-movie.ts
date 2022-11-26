import './lib/config'
import { prisma } from './lib/db'

/**
 * Retrieves a single movie from the database.
 */
async function main() {
  // const imdbId = 'tt0405094' // lives of others
  // const imdbId = 'tt1016150'
  // const imdbId = 'tt0111161' // movie (shawshank redemption)
  // const imdbId = 'tt0151804' // office space
  // const imdbId = 'tt1160419' // dune
  // const imdbId = 'tt0110912' // pulp fiction
  const imdbId = 'tt6443346'

  const result = await prisma.movie.findUnique({
    where: {
      imdbId
    }
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
