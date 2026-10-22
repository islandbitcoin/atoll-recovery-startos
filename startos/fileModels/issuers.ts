import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const destination = z.string().regex(/^nextcloud:[a-zA-Z0-9_-]{1,80}$/)
const label = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/)
const origin = z.url().refine((value) => {
  const url = new URL(value)
  return url.protocol === 'https:' && url.origin === value
})
const pending = z.looseObject({
  origin,
  destination,
  label,
  code_hash: z.string(),
  secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
})
export const issuerProfile = z.looseObject({
  id: z.uuid(),
  label,
  issuer_origin: origin,
  issuer_id: z.uuid(),
  issuer_secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  destination,
  attest_copies: z.boolean(),
})
export type AdditionalIssuer = z.infer<typeof issuerProfile>
export const additionalIssuers = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'private/additional-issuers.json' },
  z.looseObject({
    // Invalid history must fail closed rather than silently becoming empty.
    profiles: z
      .array(issuerProfile)
      .max(8)
      .refine((profiles) =>
        ['id', 'issuer_origin', 'issuer_id', 'destination', 'label'].every(
          (key) =>
            new Set(
              profiles.map((profile) => String(profile[key]).toLowerCase()),
            ).size === profiles.length,
        ),
      )
      .default([]),
    pending: pending.nullable().default(null),
  }),
)
