import * as movier from 'movier'
import pThrottle from 'p-throttle'

const throttle = pThrottle({
  limit: 3,
  interval: 1200
})

export const getTitleDetailsByIMDBId = throttle(movier.getTitleDetailsByIMDBId)
