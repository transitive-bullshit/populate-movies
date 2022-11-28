import * as types from '../types'

const comedySpecialIMDBIds = new Set(['tt1794821'])

/**
 * Performs application-specific post-processing of a movie.
 */
export function processMovie(movie: types.Movie): types.Movie | null {
  const genres = new Set(movie.genres)
  const numGenres = genres.size
  const keywords = new Set(movie.keywords)
  const countriesOfOrigin = new Set(movie.countriesOfOrigin)
  const isSingleCountryOfOrigin = countriesOfOrigin.size === 1
  // const languages = new Set(movie.languages)
  const title = movie.title.toLowerCase()
  const isStandup = isMovieLikelyStandupSpecial(movie, {
    genres,
    keywords
  })

  if (isStandup) {
    movie.genres.push('stand-up')
  }

  if (genres.has('tv movie')) {
    genres.delete('tv movie')
    genres.add('tv-movie')
  }

  if (
    movie.imdbType &&
    movie.imdbType !== 'movie' &&
    (movie.imdbType as any) !== 'video'
  ) {
    if ((movie.imdbType as any) === 'tvSpecial' && isStandup) {
      // keep stand up specials
    } else {
      // ignore non-movie / non-video titles
      // console.log('filterType', movie.imdbType, movie.title)
      return null
    }
  }

  const hasMusicGenre = genres.has('music')
  const hasDocumentaryGenre = genres.has('documentary')

  if (hasMusicGenre) {
    if (numGenres === 1) {
      // tends to be music videos
      // TODO: this may lead to false negatives
      // console.log('filter0', movie.title)
      return null
    }

    if (numGenres === 2 && hasDocumentaryGenre) {
      // tends to be documentaries about bands / touring
      // TODO: this may lead to false negatives
      // console.log('filter1', movie.title)
      return null
    }
  }

  if (
    keywords.has('edited from tv series') ||
    keywords.has('compilation movie') ||
    keywords.has('live performance')
  ) {
    // console.log('filter2', movie.title)
    // TODO: this may lead to false negatives
  }

  if (title.startsWith('national theatre live')) {
    return null
  }

  // calculate an adjusted imdbVotes so newer movies get a boost (since there
  // hasn't been enough time yet for their vote counts to stabilize)
  const daysOld = Math.max(
    1,
    (Date.now() - new Date(movie.releaseDate).getTime()) / 8.64e7
  )
  const recencyFactor = Math.max(
    1,
    // Math.min(40, (Math.sqrt(12 * (daysOld + 10)) * 40.0) / daysOld - 6)
    Math.min(30, (Math.log10(1 + 0.35 * daysOld) * 300) / daysOld - 3)
  )
  movie.imdbCustomPopularity = movie.imdbVotes
    ? movie.imdbVotes * recencyFactor
    : 0

  // compute a custom relevancy score using an s-curve of imdb ratings from 6-10
  const rating =
    movie.imdbRating ||
    (movie.rtAudienceRating ? movie.rtAudienceRating / 100 : 0) ||
    (movie.rtCriticRating ? movie.rtCriticRating / 100 : 0)
  const imdbRatingFactor = rating
    ? Math.pow(1.0 / (1.0 + Math.exp(-1.5 * (rating - 6.0))), 6.0)
    : 0

  // const yearsOld = Math.max(0, daysOld / 365)
  // const invDaysOld = Math.max(0, (yearsOld - 20) / 30)
  // const oldAgeFactor = Math.max(
  //   0,
  //   Math.min(1, 0.1 * invDaysOld + 1.0 * (1.0 - invDaysOld))
  // )

  const imdbRatingFactor2 = Math.max(
    0.5,
    Math.pow(3.8, imdbRatingFactor + 0.5) - 1.85
  )

  movie.relevancyScore = movie.imdbCustomPopularity * imdbRatingFactor2
  // console.log({ recencyFactor, imdbRatingFactor })

  // figure out whether or not we should classify this movie as a primarily
  // foreign film
  movie.foreign = false

  if (movie.language === 'en') {
    if (
      isSingleCountryOfOrigin &&
      (countriesOfOrigin.has('United Arab Emirates') ||
        countriesOfOrigin.has('India'))
    ) {
      movie.foreign = true
    }
  } else {
    // languages that most american audiences would classify as foreign
    const veryForeignLanguages = new Set([
      'hi',
      'kn',
      'te',
      'fa',
      'id',
      'ta',
      'fa',
      'ml',
      'bn',
      'uk',
      'ar',
      'sr',
      'he',
      'hu',
      'th',
      'ur',
      'pa'
    ])

    if (
      veryForeignLanguages.has(movie.language) ||
      countriesOfOrigin.has('Iran') ||
      countriesOfOrigin.has('India')
    ) {
      movie.foreign = true
    } else {
      switch (movie.language) {
        case 'ko':
          if (movie.imdbVotes < 100000 && movie.imdbCustomPopularity < 150000) {
            movie.foreign = true
          }
          break

        case 'ja':
          if (movie.imdbVotes < 140000 && movie.imdbCustomPopularity < 150000) {
            // allow for some anime
            if (!genres.has('animation') || movie.imdbVotes < 70000) {
              movie.foreign = true
            }
          }
          break

        case 'id':
          // special case for 'The Act of Killing'
          if (movie.imdbId === 'tt2375605') {
            movie.foreign = false
          } else if (movie.imdbVotes < 200000) {
            movie.foreign = true
          }
          break

        case 'it':
          if (movie.imdbVotes < 300000 && movie.imdbCustomPopularity < 500000) {
            movie.foreign = true
          }
          break

        case 'de':
          if (movie.imdbVotes < 100000 && movie.imdbCustomPopularity < 150000) {
            movie.foreign = true
          }
          break

        case 'da':
          if (movie.imdbVotes < 100000 && movie.imdbCustomPopularity < 150000) {
            movie.foreign = true
          }
          break

        case 'zh':
          if (movie.imdbVotes < 150000 && movie.imdbCustomPopularity < 150000) {
            movie.foreign = true
          }
          break

        case 'ru':
          // special case for 'Come and See'
          if (movie.imdbId === 'tt0091251') {
            movie.foreign = false
          } else if (movie.imdbVotes < 200000) {
            movie.foreign = true
          }
          break

        default:
          // 'fr', 'pt', 'es', 'da', 'sv', 'cn', 'pl', etc.
          if (movie.imdbVotes < 200000 && movie.imdbCustomPopularity < 200000) {
            movie.foreign = true
          }
      }
    }
  }

  // construct a very basic string of keywords for a naive search index
  movie.searchL = Array.from(
    new Set(
      [
        movie.title,
        movie.originalTitle,
        ...(movie.director?.split(',').slice(0, 3) || [])
      ]
        .filter(Boolean)
        .map((s) => s.toLowerCase().trim())
        .flatMap((s) => [
          s,
          replaceSpecialChars(
            s.replace(/[-:.]/g, ' ').replace(/ +/g, ' ')
          ).trim()
        ])
    )
  )
    .join('. ')
    .trim()
    .substring(0, 1024)

  return movie
}

function replaceSpecialChars(str: string) {
  return (
    str
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      // .replace(/([^\w]+|\s+)/g, '-') // replace space and other characters by hyphen
      .replace(/\-\-+/g, '-') // replaces multiple hyphens by one hyphen
      .replace(/(^-+|-+$)/g, '')
  ) // remove extra hyphens from beginning or end of the string
}

function isTextLikelyStandupSpecial(text: string): boolean {
  if (!text) {
    return false
  }

  if (/\bstand[ -]up comedy special\b/.test(text)) {
    return true
  }

  if (/\bstand[ -]up special\b/.test(text)) {
    return true
  }

  if (/\bstand[ -]up comedy\b/.test(text)) {
    return true
  }

  return false
}

function isMovieLikelyStandupSpecial(
  movie: types.Movie,
  {
    genres,
    keywords
  }: {
    genres: Set<string>
    keywords: Set<string>
  }
): boolean {
  if (comedySpecialIMDBIds.has(movie.imdbId)) {
    return true
  }

  if (
    !keywords.has('stand up') &&
    !keywords.has('stand-up') &&
    !keywords.has('stand up special') &&
    !keywords.has('stand-up special') &&
    !isTextLikelyStandupSpecial(movie.plot)
  ) {
    if (
      (keywords.has('stand up comedy') || keywords.has('stand-up comedy')) &&
      movie.imdbType !== 'movie'
    ) {
      // likely a video / Q&A session
      return true
    } else {
      return false
    }
  }

  const standupKeywords = [
    'tv special',
    'live performance',
    'stand up special',
    'stand-up special',
    'stand up comedy',
    'stand-up comedy',
    'stand up act',
    'stand-up act',
    'stand up routine',
    'stand-up routine',
    'stand up comedy performance',
    'stand-up comedy performance'
  ]

  for (const keyword of standupKeywords) {
    if (keywords.has(keyword)) {
      return true
    }
  }

  if (!genres.has('comedy')) {
    return false
  }

  if (genres.has('documentary')) {
    if (genres.size !== 2) {
      // potentially a documentary about stand up comedy
      return false
    }
  } else if (genres.size > 1) {
    // comedy + non-documentary genre => likely a film related to stand up comedy
    return false
  }

  return true
}
