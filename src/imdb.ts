import * as movier from 'movier'
import pThrottle from 'p-throttle'

const throttle = pThrottle({
  limit: 1,
  interval: 1000
})

export const getTitleDetailsByIMDBId = throttle(movier.getTitleDetailsByIMDBId)
