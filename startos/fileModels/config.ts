import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const r2 = z.looseObject({
  type: z.literal('s3').catch('s3'),
  provider: z.literal('Cloudflare').catch('Cloudflare'),
  env_auth: z.literal(false).catch(false),
  endpoint: z.string().catch(''),
  access_key_id: z.string().catch(''),
  secret_access_key: z.string().catch(''),
  region: z.literal('auto').catch('auto'),
})
const nextcloud = z.looseObject({
  type: z.literal('webdav').catch('webdav'),
  vendor: z.literal('nextcloud').catch('nextcloud'),
  url: z.string().catch(''),
  user: z.string().catch(''),
  pass: z.string().catch(''),
})
export const remotes = FileHelper.ini(
  { base: sdk.volumes.main, subpath: 'private/rclone.conf' },
  z.looseObject({
    r2: r2.catch(() => r2.parse({})),
    nextcloud: nextcloud.catch(() => nextcloud.parse({})),
  }),
)
export const configuration = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'private/copy.json' },
  z.looseObject({
    rclone_config: z
      .literal('/data/private/rclone.conf')
      .catch('/data/private/rclone.conf'),
    source: z.string().catch(''),
    source_kind: z.enum(['r2', 'issuer']).catch('r2'),
    issuer_origin: z.string().catch(''),
    issuer_id: z.string().catch(''),
    issuer_secret: z.string().catch(''),
    destination: z.string().catch(''),
  }),
)

export const alertConfiguration = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'private/alerts.json' },
  z.looseObject({
    enabled: z.boolean().catch(false),
    webhook_url: z.string().catch(''),
    generation: z.string().catch(''),
  }),
)

export const setupState = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'private/setup.json' },
  z.looseObject({
    pending_issuer: z
      .looseObject({
        origin: z.string(),
        code_hash: z.string(),
        secret: z.string(),
      })
      .nullable()
      .catch(null),
    nextcloud: z
      .looseObject({
        origin: z.string(),
        login: z.string(),
        poll_path: z.string(),
        poll_token: z.string(),
        created: z.number(),
        committed: z.boolean().catch(false),
      })
      .nullable()
      .catch(null),
  }),
)
