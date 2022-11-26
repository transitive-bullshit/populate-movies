import fs from 'node:fs/promises'

import cheerio from 'cheerio'
import got from 'got'
import pThrottle from 'p-throttle'

import * as types from '../types'
import * as config from './config'

/**
 * Rate-limit HTTP requests to Rotten Tomatoes.
 */
const throttle = pThrottle({
  limit: 4,
  interval: 2000
})

export const scrapeRottenTomatoesInfoByUrl = throttle(
  scrapeRottenTomatoesInfoByUrlImpl
)

export async function scrapeRottenTomatoesInfoByUrlImpl(
  url: string
): Promise<Partial<types.Movie>> {
  // https://www.rottentomatoes.com/m/all_quiet_on_the_western_front_2022
  const html = await got(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
    }
  }).text()

  const $ = cheerio.load(html)
  const movie: Partial<types.Movie> = {}

  try {
    const schema = JSON.parse(
      $('script[type="application/ld+json"]').html().trim()
    )
    const type = schema['@type']

    if (type === 'Movie') {
      if (schema.name) {
        movie.title = schema.name
      }

      if (schema.genre?.length) {
        movie.genres = schema.genre
      }

      if (schema.url) {
        movie.rtUrl = schema.url
      }

      if (schema.contentRating) {
        movie.mpaaRating = schema.contentRating
      }

      if (schema.aggregateRating?.ratingCount) {
        movie.rtCriticVotes = schema.aggregateRating.ratingCount
      }
    } else {
      console.warn('rotten tomatoes unexpected schema type', type, schema, url)
    }
  } catch (err) {
    console.warn(
      'error parsing rotten tomatoes movie schema',
      err.toString(),
      url
    )
  }

  try {
    const data = JSON.parse($('script[id="curation-json"]').html().trim())

    if (data.emsId) {
      movie.emsId = data.emsId
    }

    if (data.rtId) {
      movie.rtId = data.rtId
    }

    if (data.type !== 'movie') {
      console.warn(
        'rotten tomatoes unexpected curation data type',
        data.type,
        data,
        url
      )
    }
  } catch (err) {
    console.warn(
      'error parsing rotten tomatoes curation data',
      err.toString(),
      url
    )
  }

  const $scores = $('score-board')
  const rtAudienceRating = parseInt($scores.attr('audiencescore'), 10)
  if (!movie.rtAudienceRating && !isNaN(rtAudienceRating)) {
    movie.rtAudienceRating = rtAudienceRating
  }

  const rtCriticRating = parseInt($scores.attr('tomatometerscore'), 10)
  if (!movie.rtCriticRating && !isNaN(rtCriticRating)) {
    movie.rtCriticRating = rtCriticRating
  }

  const audienceVotes = $scores.find('a[slot="audience-count"]').text() // 1,000+ Ratings
  const rtAudienceVotes = parseInt(
    audienceVotes.replace(/[^\d]/g, '').trim(),
    10
  )
  if (!movie.rtAudienceVotes && !isNaN(rtAudienceVotes)) {
    movie.rtAudienceVotes = rtAudienceVotes
  }

  const criticVotes = $scores.find('a[slot="critics-count"]').text() // 110 Reviews
  const rtCriticVotes = parseInt(criticVotes.replace(/[^\d]/g, '').trim(), 10)
  if (!movie.rtCriticVotes && !isNaN(rtCriticVotes)) {
    movie.rtCriticVotes = rtCriticVotes
  }

  movie.mpaaRating = $scores.attr('rating').trim()
  movie.plot = $('#movieSynopsis').text().trim()
  movie.genres = $('.content-meta .genre')
    .text()
    .replace(/\s+/gm, ' ')
    .trim()
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean)

  const criticsConsensus = $('[data-qa="critics-consensus"]').text().trim()
  if (criticsConsensus) {
    movie.rtCriticsConsensus = criticsConsensus
  }

  return movie
}

export async function loadRTMoviesFromCache(): Promise<types.RTMovies> {
  let rtMovies: types.RTMovies = {}

  try {
    console.log(`loading RT movies from cache (${config.rtMoviesPath})`)

    rtMovies = JSON.parse(
      await fs.readFile(config.rtMoviesPath, { encoding: 'utf-8' })
    )

    console.warn(
      `loaded ${Object.keys(rtMovies).length} RT movies from cache (${
        config.rtMoviesPath
      })`
    )
  } catch (err) {
    console.warn(`warn: unable to load RT movie cache (${config.rtMoviesPath})`)
    console.warn(
      "You can safely ignore this warning if you haven't run `populate-rt-movies.ts`."
    )
    console.warn(err)
  }

  return rtMovies
}
