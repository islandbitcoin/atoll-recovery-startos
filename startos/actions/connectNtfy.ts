import { randomUUID } from 'node:crypto'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { alertConfiguration } from '../fileModels/config'
import { preparePrivateFiles } from '../utils'

const topic = 'atoll-recovery-health'

export const connectNtfy = sdk.Action.withoutInput(
  'connect-ntfy',
  {
    name: i18n('Connect NTFY'),
    description: i18n(
      'Connect the installed NTFY service with a dedicated write-only publisher. No token entry is required.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  async ({ effects }) => {
    const origin = await sdk.host
      .get(effects, { packageId: 'ntfy', hostId: 'ui-multi' }, (host) => {
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
          (url) =>
            url.protocol === 'https:' &&
            url.pathname === '/' &&
            !url.search &&
            !url.hash,
        )?.origin
      })
      .once()
    if (!origin)
      throw new Error(
        i18n('Start NTFY and configure an HTTPS Web UI address first.'),
      )
    await preparePrivateFiles()
    const current = await alertConfiguration.read().once()
    // Reuse the scoped token on retries rather than minting one on every click.
    let token =
      current?.provider === 'ntfy' &&
      current.webhook_url === origin &&
      current.topic === topic
        ? current.token
        : ''
    if (!token) {
      const result = await sdk.action.run({
        effects,
        packageId: 'ntfy',
        actionId: 'provision-publisher',
        input: () => ({ packageId: 'atoll-recovery', topic }),
      })
      if (result?.version !== '1' || result.result?.type !== 'group')
        throw new Error(i18n('Unable to connect the NTFY publisher.'))
      const field = result.result.value.find(
        (field) =>
          field.type === 'single' &&
          field.masked === true &&
          /^tk_/.test(field.value),
      )
      if (
        field?.type !== 'single' ||
        !/^tk_[A-Za-z0-9_-]{1,256}$/.test(field.value)
      )
        throw new Error(i18n('Unable to connect the NTFY publisher.'))
      token = field.value
    }
    await alertConfiguration.merge(effects, {
      enabled: true,
      provider: 'ntfy',
      webhook_url: origin,
      token,
      topic,
      generation: randomUUID(),
    })
    await sdk.action.clearTask(effects, 'atoll-recovery:configure-alerts')
    return {
      version: '1',
      title: i18n('NTFY connected'),
      message: i18n(
        'Subscribe to atoll-recovery-health in NTFY. Start Atoll and confirm a received alert. Local notifications cannot report loss of Zion.',
      ),
      result: null,
    }
  },
)
