import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { configuration, remotes } from '../fileModels/config'
import { additionalIssuers } from '../fileModels/issuers'
import { preparePrivateFiles, secureOrigin, connectionRequest } from '../utils'

export const connectAdditionalIssuer = sdk.Action.withInput(
  'connect-additional-issuer',
  {
    name: i18n('Connect Additional Issuer'),
    description: i18n(
      'Keep the existing issuer and add a separate backup directory, copy history and health checks.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  sdk.InputSpec.of({
    name: sdk.Value.text({
      name: i18n('Backup name'),
      required: true,
      default: null,
    }),
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
    directory: sdk.Value.text({
      name: i18n('Nextcloud backup directory'),
      required: true,
      default: null,
    }),
    receipts: sdk.Value.toggle({
      name: i18n('Enable verified-copy receipts'),
      default: false,
    }),
  }),
  async () => ({}),
  async ({ effects, input }) => {
    await preparePrivateFiles()
    const primary = await configuration.read().once()
    const remote = await remotes.read().once()
    if (!primary?.source || !primary.destination || !remote?.nextcloud.pass)
      throw new Error(i18n('Connect the primary issuer and Nextcloud first.'))
    const origin = secureOrigin(input.origin)
    const name = input.name.trim()
    const directory = input.directory.trim()
    const code = input.code.trim()
    if (!/^[A-Za-z0-9_-]{43}$/.test(code))
      throw new Error(
        i18n('Enter the unexpired pairing code from the issuer administrator.'),
      )
    if (
      !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/.test(name) ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(directory)
    )
      throw new Error(
        i18n(
          'Choose a distinct backup name, issuer and directory. Existing locations cannot be replaced.',
        ),
      )
    const destination = 'nextcloud:' + directory
    const saved = await additionalIssuers.read().once()
    const profiles = saved?.profiles ?? []
    const existing = profiles.find(
      (profile) => profile.issuer_origin === origin,
    )
    if (
      primary.issuer_origin === origin ||
      primary.destination.toLowerCase() === destination.toLowerCase() ||
      profiles.some(
        (profile) =>
          profile.id !== existing?.id &&
          (profile.destination.toLowerCase() === destination.toLowerCase() ||
            profile.label.toLowerCase() === name.toLowerCase()),
      ) ||
      (existing &&
        (existing.destination !== destination || existing.label !== name))
    )
      throw new Error(
        i18n(
          'Choose a distinct backup name, issuer and directory. Existing locations cannot be replaced.',
        ),
      )
    if (!existing && profiles.length >= 8)
      throw new Error(
        i18n('At most eight additional issuers can be connected.'),
      )
    const codeHash = createHash('sha256').update(code).digest('hex')
    let secret = ''
    await additionalIssuers.update(effects, (current) => {
      const previous = current?.pending
      secret =
        previous?.origin === origin &&
        previous.code_hash === codeHash &&
        previous.destination === destination &&
        previous.label === name
          ? previous.secret
          : randomBytes(32).toString('base64url')
      return {
        ...current,
        profiles: current?.profiles ?? [],
        pending: {
          origin,
          destination,
          label: name,
          code_hash: codeHash,
          secret,
        },
      }
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
    if (
      result.issuer_id === primary.issuer_id ||
      profiles.some(
        (profile) =>
          profile.id !== existing?.id && profile.issuer_id === result.issuer_id,
      ) ||
      (existing && existing.issuer_id !== result.issuer_id)
    )
      throw new Error(
        i18n(
          'Choose a distinct backup name, issuer and directory. Existing locations cannot be replaced.',
        ),
      )
    await additionalIssuers.update(effects, (current) => {
      if (
        !current ||
        current.pending?.secret !== secret ||
        current.pending.code_hash !== codeHash
      )
        throw new Error(
          i18n('Connection failed. Check approval, origin and network access.'),
        )
      const latest = current.profiles.find(
        (old) => old.issuer_origin === origin,
      )
      if (
        latest &&
        (latest.issuer_id !== result.issuer_id ||
          latest.destination !== destination ||
          latest.label !== name)
      )
        throw new Error(
          i18n(
            'Choose a distinct backup name, issuer and directory. Existing locations cannot be replaced.',
          ),
        )
      const profile = {
        ...latest,
        id: latest?.id ?? randomUUID(),
        label: name,
        issuer_origin: origin,
        issuer_id: result.issuer_id,
        issuer_secret: secret,
        destination,
        attest_copies: input.receipts,
      }
      return {
        ...current,
        profiles: latest
          ? current.profiles.map((old) =>
              old.id === latest.id ? profile : old,
            )
          : [...current.profiles, profile],
        pending: null,
      }
    })
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
