# @session.js/bun-network-remote

This network adapter for @session.js/client uses Bun.sh runtime to fetch Session nodes. It is intended to be used in environments that should keep secret keys but can't connect to Session nodes, such as browsers. This network connector fetches serverside part of this package that validates request and passes it to onRequest method from @session.js/bun-network.

[Simple example of project that uses @session.js/bun-network-remote](https://github.com/sessionjs/examples/tree/main/browser-simple)

Usage:

Client-side (where Session client runs):

```ts
import { Session } from '@session.js/client'
import { BunNetworkRemoteClient } from '@session.js/bun-network-remote'

new Session({ 
  network: new BunNetworkRemoteClient({ 
    proxy: 'https://my-proxy.example.org:12345/' 
    // this endpoint must be accessible in your environment
    // i.e. if you're building Session client in browser, make sure
    // that my-proxy.example.org has a valid SSL certificate, CORS and SSL settings
  })
})
```

Client-side part will send POST requests to this URL with FormData or JSON body.

Server-side (proxy server):

```ts
// Runtime must be Bun.sh
// Web server can be anything: Express, Fastify, Elysia, Bun's web server, etc...
// Validation is done internally and throws @session.js/error RuntimeValidation errors

import { Elysia } from 'elysia'
import { BunNetworkRemoteServer } from '@session.js/bun-network-remote'
const network = new BunNetworkRemoteServer()

new Elysia()
  .post('/', ({ body }) => network.onRequest(body))
  .listen(12345)
```

## Made for session.js

Use Session messenger programmatically with [Session.js](https://github.com/sessionjs/client): Session bots, custom Session clients, and more.

## Donate

[hloth.dev/donate](https://hloth.dev/donate)