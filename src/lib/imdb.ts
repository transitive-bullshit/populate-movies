import * as movier from 'movier'
import pThrottle from 'p-throttle'

/**
 * Rate-limit HTTP requests to IMDB (max 3 per 1200ms). Note that each call to
 * `movier.getTitleDetailsByIMDBId` includes multiple HTTP GET requests to IMDB.
 *
 * We're using a modified version of `movier` which removes many of these
 * additional requests which fetch data we're not interested in. Otherwise, we
 * would need to use a stricter rate-limit here (originally max 1 per 1000ms).
 */
const throttle = pThrottle({
  limit: 3,
  interval: 1200
})

export const getTitleDetailsByIMDBId = throttle(movier.getTitleDetailsByIMDBId)
