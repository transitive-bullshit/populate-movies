import './lib/config'
import { prisma } from './lib/db'
import { fetchAllFlickMetrixMovies } from './lib/flick-metrix'

/**
 * Misc script for running random prisma queries.
 */
async function main() {
  const res = await fetchAllFlickMetrixMovies()
  // const res = await prisma.movie.findMany({
  //   where: {
  //     imdbVotes: {
  //       gte: 1000
  //     },
  //     foreign: false
  //   },
  //   orderBy: {
  //     imdbVotes: 'desc'
  //     // imdbCustomPopularity: 'desc'
  //     // tmdbPopularity: 'desc'
  //   }
  // })

  // count the number of movies in each language
  // const l = {}
  // for (const m of res) {
  //   if (!l[m.language]) {
  //     l[m.language] = 1
  //   } else {
  //     l[m.language]++
  //   }
  // }
  // console.log(JSON.stringify(l, null, 2))

  console.warn(res.length)
  // // // console.log(res)
  console.log(JSON.stringify(res, null, 2))
}

main()
