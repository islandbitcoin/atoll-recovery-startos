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
