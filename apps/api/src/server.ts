import { serve } from '@hono/node-server'

import { createApp } from './app.js'

const port = Number.parseInt(process.env.PORT ?? '8787', 10)

serve(
  {
    fetch: createApp().fetch,
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`Warren API listening on http://127.0.0.1:${info.port}`)
  },
)
