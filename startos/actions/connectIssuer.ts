import { createHash, randomBytes } from 'node:crypto'
import { z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { configuration, setupState } from '../fileModels/config'
import {
  preparePrivateFiles,
  hasVerifiedEvidence,
  secureOrigin,
  connectionRequest,
} from '../utils'

export const connectIssuer = sdk.Action.withInput(
  'connect-issuer',
  {
    name: i18n('Connect Issuer'),
    description: i18n(
      'Pair a backup-only reader. No R2 credentials are required.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  sdk.InputSpec.of({
    origin: sdk.Value.text({
      name: i18n('Issuer HTTPS origin'),
      required: true,
      default: null,
    }),
    code: sdk.Value.text({
      name: i18n('Private pairing code'),
      required: true,
      default: null,
      masked: true,
    }),
  }),
  async () => ({
    origin: (await configuration.read().once())?.issuer_origin || undefined,
  }),
  async ({ effects, input }) => {
    const origin = secureOrigin(input.origin)
    const code = input.code.trim()
    if (!/^[A-Za-z0-9_-]{43}$/.test(code))
      throw new Error(
        i18n('Enter the unexpired pairing code from the issuer administrator.'),
      )
    await preparePrivateFiles()
    const old = await configuration.read().once()
    const locked = await hasVerifiedEvidence()
    if (
      locked &&
      (old?.source_kind !== 'issuer' || old.issuer_origin !== origin)
    )
      throw new Error(
        i18n(
          'Backup locations with verified evidence are fixed. Changing them requires a reviewed migration.',
        ),
      )
    const codeHash = createHash('sha256').update(code).digest('hex')
    const saved = (await setupState.read().once())?.pending_issuer
    const secret =
      saved?.origin === origin && saved.code_hash === codeHash
        ? saved.secret
        : randomBytes(32).toString('base64url')
    // Commit the device secret before claiming, so a lost response is recoverable.
    await setupState.merge(effects, {
      pending_issuer: { origin, code_hash: codeHash, secret },
    })
    const result = z
      .object({ issuer_id: z.uuid(), connection_id: z.uuid() })
      .parse(
        await connectionRequest(effects, 'pair-issuer', {
          origin,
          code,
          secret,
        }),
      )
    const source = 'issuer:' + result.issuer_id
    if (locked && source !== old?.source)
      throw new Error(
        i18n(
          'Backup locations with verified evidence are fixed. Changing them requires a reviewed migration.',
        ),
      )
    await configuration.merge(effects, {
      source_kind: 'issuer',
      source,
      issuer_origin: origin,
      issuer_id: result.issuer_id,
      issuer_secret: secret,
    })
    await setupState.merge(effects, { pending_issuer: null })
    await sdk.action.clearTask(effects, 'atoll-recovery:connect-issuer')
    return {
      version: '1',
      title: i18n('Issuer connected'),
      message: i18n(
        'The paired reader can download existing encrypted exports. Verify a copy before relying on recovery.',
      ),
      result: null,
    }
  },
)
