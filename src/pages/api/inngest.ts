import { serve } from 'inngest/next'

import { inngest } from '../../inngest/client'
import { functions } from '../../inngest/functions'

export default serve({
  client: inngest,
  functions
})
