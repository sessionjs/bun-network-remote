import { BunNetwork } from '@session.js/bun-network'
import { SessionValidationError, SessionValidationErrorCode } from '@session.js/errors'
import { SessionJsError } from '@session.js/errors/dist/session-js'
import { RequestType } from '@session.js/types/network/request'
import { z } from 'zod'

const swarmSchema = z.object({
  ip: z.string().ip(),
  port: z.coerce.number().int().positive(),
  pubkey_ed25519: z.string(),
  pubkey_x25519: z.string(),
})

const snodeSchema = z.object({
  public_ip: z.string().ip(),
  storage_port: z.number().int().positive(),
  pubkey_x25519: z.string(),
  pubkey_ed25519: z.string()
})

const requestNamespace = z.object({
  namespace: z.number().int().or(z.literal('all')),
  pubkey: z.string(),
  isOurPubkey: z.boolean(),
  lastHash: z.string().optional(),
  signature: z.object({
    timestamp: z.number().int().positive(),
    pubkeyEd25519: z.string(),
    signature: z.string()
  })
})

const Uint8ArraySchema = z.array(z.number().int().min(0).max(255))

const bodySchemas: {
  [key in RequestType]?: z.ZodObject<any, any, any>
} = {
  [RequestType.Poll]: z.object({
    swarm: swarmSchema,
    namespaces: z.array(requestNamespace)
  }),
  [RequestType.Store]: z.object({
    data64: z.string(),
    destination: z.string(),
    ttl: z.number().int().positive(),
    timestamp: z.number().int().positive(),
    namespace: z.number().int(),
    swarm: swarmSchema
  }),
  [RequestType.GetSwarms]: z.object({
    snode: snodeSchema,
    pubkey: z.string()
  }),
  [RequestType.UploadAttachment]: z.object({
    data: Uint8ArraySchema
  })
}

function convertArrayBufferToArray(obj: object): object {
  if (obj instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(obj))
  }

  if (Array.isArray(obj)) {
    return obj.map(convertArrayBufferToArray)
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce<{ [key: string]: any }>((acc, key) => {
      acc[key] = convertArrayBufferToArray((obj as { [key: string]: any })[key])
      return acc
    }, {})
  }

  return obj
}

export class BunNetworkRemoteServer {
  private bunNetwork: BunNetwork

  constructor() {
    this.bunNetwork = new BunNetwork()
  }

  async onRequest(body: unknown): Promise<object> {
    const payload = await z.object({
      type: z.nativeEnum(RequestType),
      body: z.any()
    }).safeParseAsync(body)
    if (!payload.success) {
      throw new SessionValidationError({ code: SessionValidationErrorCode.Generic, message: 'Payload is invalid or method unsupported' })
    }
    
    const bodySchema = bodySchemas[payload.data.type]
    let requestBody: any
    if (bodySchema) {
      const body = await bodySchema.safeParseAsync(payload.data.body)
      if(!body.success) {
        throw new SessionValidationError({ code: SessionValidationErrorCode.Generic, message: 'Body is invalid' })
      }
      requestBody = body.data
    } else {
      requestBody = {}
    }

    try {
      const response = await this.bunNetwork.onRequest(payload.data.type, requestBody)
      return { response: convertArrayBufferToArray(response) }
    } catch(e) {
      if (e instanceof SessionJsError) {
        return { error: { instance: e.name, code: e.code, message: e.message } }
      } else {
        throw e
      }
    }
  }
}