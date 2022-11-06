import './lib/config'
import { prisma } from './lib/db'

// import { TMDB } from './lib/tmdb'

/**
 * Computes the unique genres and keywords across all movies in the database.
 */
async function main() {
  // const imdbId = 'tt0405094' // lives of others
  // const imdbId = 'tt1016150'
  const imdbId = 'tt0111161' // movie (shawshank redemption)

  const result = await prisma.movie.findUnique({
    where: {
      imdbId
    }
  })

  // console.log(JSON.stringify(result, null, 2))

  // const tmdb = new TMDB({ bearerToken: process.env.TMDB_BEARER_TOKEN })
  // const credits = await tmdb.getMovieCredits(result.tmdbId)
  // console.log(JSON.stringify(credits, null, 2))
}

main()
