export * from "./client.js"
export * from "./server.js"

import { createMinervaClient } from "./client.js"
import { createMinervaServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export * as data from "./data.js"

export async function createMinerva(options?: ServerOptions) {
  const server = await createMinervaServer({
    ...options,
  })

  const client = createMinervaClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}

export const createOpencode = createMinerva
