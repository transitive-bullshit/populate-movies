import got from 'got'

import './lib/config'
import { prisma } from './lib/db'

/**
 * Misc script for running random prisma queries.
 */
async function main() {
  let currentPage = 0
  let results: any[] = []
  do {
    const searchParams = new URLSearchParams({
      amazonRegion: 'us',
      cast: '',
      comboScoreMax: '100',
      comboScoreMin: '0',
      countryCode: 'us',
      criticRatingMax: '100',
      criticRatingMin: '0',
      criticReviewsMax: '100000',
      criticReviewsMin: '0',
      currentPage: `${currentPage}`,
      deviceID: '1',
      director: '',
      format: 'movies',
      genreAND: 'false',
      imdbRatingMax: '10',
      imdbRatingMin: '0',
      imdbVotesMax: '10000000',
      imdbVotesMin: '0',
      inCinemas: 'true',
      includeDismissed: 'false',
      includeSeen: 'false',
      includeWantToWatch: 'true',
      isCastSearch: 'false',
      isDirectorSearch: 'false',
      isPersonSearch: 'false',
      language: 'all',
      letterboxdScoreMax: '100',
      letterboxdScoreMin: '0',
      letterboxdVotesMax: '1200000',
      letterboxdVotesMin: '0',
      metacriticRatingMax: '100',
      metacriticRatingMin: '0',
      metacriticReviewsMax: '100',
      metacriticReviewsMin: '0',
      onAmazonPrime: 'false',
      onAmazonVideo: 'false',
      onDVD: 'false',
      onNetflix: 'false',
      pageSize: '1000', // '20'
      path: '/',
      person: '',
      plot: '',
      queryType: 'GetFilmsToSieve',
      searchTerm: '',
      sharedUser: '',
      sortOrder: 'comboScoreDesc',
      title: '',
      token: '',
      watchedRating: '0',
      writer: '',
      yearMax: '2022',
      yearMin: '1900'
    })
    const url = `https://flickmetrix.com/api2/values/getFilms?${searchParams.toString()}`

    try {
      console.warn(currentPage)
      const res = JSON.parse(await got(url).json())
      if (!res.length) {
        break
      }
      console.warn(currentPage, '=>', res.length)
      results = results.concat(res)
      ++currentPage
    } catch (err) {
      console.error(err)
      break
    }
  } while (true)

  console.log(JSON.stringify(results, null, 2))

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

  // console.warn(res.length)
  // // // console.log(res)
  // console.log(JSON.stringify(res, null, 2))
}

main()
