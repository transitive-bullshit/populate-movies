import './lib/config'
import { prisma } from './lib/db'
import { processMovie } from './lib/process-movie'

/**
 * Retrieves a single movie from the database and process it for debugging
 * purposes.
 */
async function main() {
  const id = 7183

  const [movie] = await Promise.all([
    prisma.movie.findUnique({
      where: {
        id
      }
    })
  ])

  if (!processMovie(movie)) {
    return null
  }

  console.log(JSON.stringify(movie, null, 2))
}

main()
