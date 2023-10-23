import * as edgedb from 'edgedb'

import schema from '../../dbschema/edgeql-js'

const client = edgedb.createClient()

export { client, schema }

// await client.ensureConnected()
