import './lib/config'
import { prisma } from './lib/db'

/**
 * Computes the unique genres and keywords across all movies in the database.
 */
async function main() {
  const results = await prisma.movie.findMany({
    select: {
      genres: true,
      keywords: true
    }
  })

  console.warn(results.length, 'movies')

  const genresSet = new Set<string>()
  const keywordsSet = new Set<string>()

  for (const result of results) {
    for (const genre of result.genres) {
      genresSet.add(genre)
    }

    for (const keyword of result.keywords) {
      keywordsSet.add(keyword)
    }
  }

  const genres = Array.from(genresSet).sort()
  const keywords = Array.from(keywordsSet).sort()

  console.warn('unique genres', genres.length)
  console.warn('unique keywords', keywords.length)

  console.log(
    JSON.stringify(
      {
        genres,
        keywords
      },
      null,
      2
    )
  )
}

main()
