import * as fs from 'node:fs/promises'
import { z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { configuration, remotes, setupState } from '../fileModels/config'
import {
  preparePrivateFiles,
  hasVerifiedEvidence,
  secureOrigin,
  connectionRequest,
  mounts,
} from '../utils'

export const connectNextcloud = sdk.Action.withInput(
  'connect-nextcloud',
  {
    name: i18n('Connect Nextcloud'),
    description: i18n(
      'Open browser approval for a dedicated non-admin Nextcloud account. No app password is pasted into this form.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  sdk.InputSpec.of({
    origin: sdk.Value.text({
      name: i18n('Nextcloud HTTPS origin'),
      required: true,
      default: null,
    }),
  }),
  async ({ effects }) => {
    const url = (await remotes.read().once())?.nextcloud.url
    if (url) return { origin: new URL(url).origin }
    // Discover a browser-reachable HTTPS origin from the published UI interface.
    // This is a one-shot form prefill, not a runtime service connection.
    const origin = await sdk.host
      .get(effects, { packageId: 'nextcloud', hostId: 'main' }, (host) => {
        const urls = Object.values(host?.bindings ?? {}).flatMap((binding) => {
          const address = binding.interfaces.ui?.addressInfo
          return address
            ? [
                ...address.public.filter({ kind: 'domain' }).format('url'),
                ...address.nonLocal
                  .filter({ kind: ['domain', 'mdns'] })
                  .format('url'),
              ]
            : []
        })
        return urls.find(
          (u) =>
            u.protocol === 'https:' &&
            u.pathname === '/' &&
            !u.search &&
            !u.hash,
        )?.origin
      })
      .once()
    return { origin: origin ?? undefined }
  },
  async ({ effects, input }) => {
    const origin = secureOrigin(input.origin)
    await preparePrivateFiles()
    const stored = await remotes.read().once()
    if (await hasVerifiedEvidence()) {
      if (
        !stored?.nextcloud.url ||
        new URL(stored.nextcloud.url).origin !== origin
      )
        throw new Error(
          i18n(
            'Backup locations with verified evidence are fixed. Changing them requires a reviewed migration.',
          ),
        )
    }
    // Do not discard a successful single-use poll whose configuration save failed.
    try {
      await fs.access(
        sdk.volumes.main.subpath('private/nextcloud-authorized.json'),
      )
      throw new Error(
        i18n(
          'Finish the pending Nextcloud connection before starting another.',
        ),
      )
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      )
        throw error
    }
    const old = (await setupState.read().once())?.nextcloud
    if (old?.committed)
      throw new Error(
        i18n(
          'Finish the pending Nextcloud connection before starting another.',
        ),
      )
    const pending =
      old?.origin === origin && Date.now() - old.created < 15 * 60_000
        ? old
        : {
            ...z
              .object({
                origin: z.string(),
                login: z.string(),
                poll_path: z.string(),
                poll_token: z.string(),
              })
              .parse(
                await connectionRequest(effects, 'nextcloud-start', { origin }),
              ),
            created: Date.now(),
          }
    await setupState.merge(effects, { nextcloud: pending })
    return {
      version: '1',
      title: i18n('Approve Nextcloud access'),
      message: i18n(
        'Open the approval link and sign in with the dedicated backup account. Administrator authorization is rejected. Then run Finish Nextcloud Connection.',
      ),
      result: {
        type: 'single',
        name: i18n('Private authorization link'),
        description: null,
        value: pending.login,
        masked: true,
        copyable: true,
        qr: false,
        launchable: true,
      },
    }
  },
)

export const finishNextcloud = sdk.Action.withoutInput(
  'finish-nextcloud',
  {
    name: i18n('Finish Nextcloud Connection'),
    description: i18n(
      'Collect the approved app password privately and save the dedicated destination.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  async ({ effects }) => {
    await preparePrivateFiles()
    const pending = (await setupState.read().once())?.nextcloud
    if (!pending)
      throw new Error(
        i18n('Start Connect Nextcloud before finishing authorization.'),
      )
    if (pending.committed) {
      await fs.rm(
        sdk.volumes.main.subpath('private/nextcloud-authorized.json'),
        { force: true },
      )
      await setupState.merge(effects, { nextcloud: null })
      await sdk.action.clearTask(effects, 'atoll-recovery:connect-nextcloud')
      return {
        version: '1',
        title: i18n('Nextcloud connected'),
        message: i18n(
          'Start the service and verify independent-copy freshness. Browser approval is not an authenticated restore drill.',
        ),
        result: null,
      }
    }
    const response = await connectionRequest(
      effects,
      'nextcloud-finish',
      pending,
    )
    if (
      z.object({ wrong_account: z.literal(true) }).safeParse(response).success
    ) {
      await setupState.merge(effects, { nextcloud: null })
      throw new Error(
        i18n(
          'Use a dedicated non-admin Nextcloud account. Start Connect Nextcloud again.',
        ),
      )
    }
    if (z.object({ pending: z.literal(true) }).safeParse(response).success)
      return {
        version: '1',
        title: i18n('Waiting for browser approval'),
        message: i18n(
          'Approve the dedicated account in the browser, then run this action again.',
        ),
        result: null,
      }
    const result = z
      .object({
        username: z.string(),
        app_password: z.string(),
        webdav_url: z.string(),
      })
      .parse(response)
    const old = await configuration.read().once()
    const stored = await remotes.read().once()
    if (await hasVerifiedEvidence()) {
      if (
        stored?.nextcloud.user !== result.username ||
        stored.nextcloud.url !== result.webdav_url
      )
        throw new Error(
          i18n(
            'Backup locations with verified evidence are fixed. Changing them requires a reviewed migration.',
          ),
        )
    }
    const pass = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'runner' },
      mounts(),
      'nextcloud-password',
      async (sub) => {
        const out = await sub.exec(['rclone', 'obscure', '-'], {
          input: result.app_password + '\n',
        })
        if (out.exitCode !== 0 || !out.stdout.toString().trim())
          throw new Error(i18n('Unable to prepare transfer credentials.'))
        return out.stdout.toString().trim()
      },
    )
    await remotes.merge(effects, {
      nextcloud: { url: result.webdav_url, user: result.username, pass },
    })
    await configuration.merge(effects, {
      destination: old?.destination || 'nextcloud:atoll-recovery',
    })
    await setupState.merge(effects, {
      nextcloud: { ...pending, committed: true },
    })
    await fs.unlink(
      sdk.volumes.main.subpath('private/nextcloud-authorized.json'),
    )
    await setupState.merge(effects, { nextcloud: null })
    await sdk.action.clearTask(effects, 'atoll-recovery:connect-nextcloud')
    return {
      version: '1',
      title: i18n('Nextcloud connected'),
      message: i18n(
        'Start the service and verify independent-copy freshness. Browser approval is not an authenticated restore drill.',
      ),
      result: null,
    }
  },
)
