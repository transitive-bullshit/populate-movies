import * as types from '../types'

const comedySpecialIMDBIds = new Set(['tt1794821'])

/**
 * Performs application-specific post-processing of a movie.
 */
export function processMovie(
  movie: types.Movie,
  { flickMetrixMovies }: { flickMetrixMovies?: types.FlickMetrixMovies } = {}
): types.Movie | null {
  const genres = new Set(movie.genres)
  const numGenres = genres.size
  const keywords = new Set(movie.keywords)
  const countriesOfOrigin = new Set(movie.countriesOfOrigin)
  const isSingleCountryOfOrigin = countriesOfOrigin.size === 1
  // const languages = new Set(movie.languages)
  const title = movie.title.toLowerCase()

  if (movie.imdbType !== 'movie' && (movie.imdbType as any) !== 'video') {
    // ignore non-movie / non-video titles
    return null
  }

  const hasMusicGenre = genres.has('music')
  const hasDocumentaryGenre = genres.has('documentary')

  if (hasMusicGenre) {
    if (numGenres === 1) {
      // tends to be music videos
      // TODO: this may lead to false negatives
      return null
    }

    if (numGenres === 2 && hasDocumentaryGenre) {
      // tends to be documentaries about bands / touring
      // TODO: this may lead to false negatives
      return null
    }
  }

  if (
    keywords.has('edited from tv series') ||
    keywords.has('compilation movie') ||
    keywords.has('live performance')
  ) {
    return null
  }

  if (title.startsWith('national theatre live')) {
    return null
  }

  if (
    isMovieLikelyStandupSpecial(movie, {
      genres,
      keywords
    })
  ) {
    movie.genres.push('stand up')
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

  // compute a custom relevancy score using an s-curve of imdb ratings of 6-10
  const imdbRatingFactor = movie.imdbRating
    ? Math.pow(1.0 / (1.0 + Math.exp(-1.5 * (movie.imdbRating - 6.0))), 6.0)
    : 0
  movie.relevancyScore = imdbRatingFactor * movie.imdbCustomPopularity

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

  // optionally fill in additional metadata from flickmetrix.com
  const flickMetrixMovie = flickMetrixMovies
    ? flickMetrixMovies[movie.imdbId]
    : null

  if (flickMetrixMovie) {
    if (!movie.cast?.length) {
      movie.cast =
        flickMetrixMovie.Cast?.split(',').map((name) => name.trim()) ?? []
    }

    if (!movie.director) {
      movie.director = flickMetrixMovie.Director || null
    }

    movie.production = flickMetrixMovie.Production || null
    movie.awardsSummary = flickMetrixMovie.Awards || null

    // rotten tomatoes
    movie.rtCriticRating = flickMetrixMovie.CriticRating ?? null
    movie.rtCriticVotes = flickMetrixMovie.CriticReviews ?? null
    movie.rtAudienceRating = flickMetrixMovie.AudienceRating ?? null
    movie.rtAudienceVotes = flickMetrixMovie.AudienceReviews ?? null
    movie.rtUrl = flickMetrixMovie.RTUrl || null

    if (movie.rtUrl) {
      movie.rtUrl = movie.rtUrl.replace(/\/$/g, '').trim()
    }

    // letterboxd
    movie.letterboxdScore = flickMetrixMovie.LetterboxdScore ?? null
    movie.letterboxdVotes = flickMetrixMovie.letterboxdVotes ?? null

    // flickmetrix
    movie.flickMetrixId = flickMetrixMovie.ID || null
    movie.flickMetrixScore = flickMetrixMovie.ComboScore ?? null

    // Empirically, a lot of the youtube trailers that exist on flickmetrix that
    // don't exist on tmdb are videos that have been removed from youtube.
    // if (flickMetrixMovie.Trailer && !movie.trailerYouTubeId) {
    //   movie.trailerYouTubeId = flickMetrixMovie.Trailer
    //   movie.trailerUrl = `https://youtube.com/watch?v=${movie.trailerYouTubeId}`
    //   console.log('flickmetrix new trailer', movie.trailerUrl)
    // }

    const movieHasIMDBRating = movie.imdbRating && movie.imdbVotes
    const flickMetrixMovieHasIMDBRating =
      flickMetrixMovie.imdbRating && flickMetrixMovie.imdbVotes

    // if we have IMDB ratings from two sources, take the one with more votes,
    // which is likely to be more recent
    if (
      flickMetrixMovieHasIMDBRating &&
      (!movieHasIMDBRating || flickMetrixMovie.imdbVotes > movie.imdbVotes)
    ) {
      movie.imdbRating = flickMetrixMovie.imdbRating
      movie.imdbVotes = flickMetrixMovie.imdbVotes
    }

    if (!movie.plot && flickMetrixMovie.Plot) {
      movie.plot = flickMetrixMovie.Plot
    }
  }

  movie.searchL = Array.from(
    new Set(
      [movie.title, movie.originalTitle, movie.director]
        .filter(Boolean)
        .map((s) => s.toLowerCase().trim())
        .flatMap((s) => [
          s,
          s.replace(/[-:.]/g, ' ').replace(/ +/g, ' ').trim()
        ])
    )
  )
    .join('. ')
    .trim()

  return movie
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
