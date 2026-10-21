import { randomUUID } from 'node:crypto'
import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { alertConfiguration } from '../fileModels/config'
import { preparePrivateFiles } from '../utils'

const { InputSpec, Value } = sdk
export const configureAlerts = sdk.Action.withInput(
  'configure-alerts',
  {
    name: i18n('Configure Alerts'),
    description: i18n(
      'Choose an HTTPS JSON receiver or explicitly disable notifications. Enabled routing gets fresh delivery confirmation on start.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    enabled: Value.toggle({
      name: i18n('Enable notifications'),
      default: true,
    }),
    webhookUrl: Value.text({
      name: i18n('Private HTTPS webhook URL'),
      required: false,
      default: null,
      masked: true,
    }),
  }),
  async () => ({
    enabled: (await alertConfiguration.read().once())?.enabled ?? true,
  }),
  async ({ effects, input }) => {
    let route = input.enabled ? (input.webhookUrl?.trim() ?? '') : ''
    if (input.enabled) {
      try {
        const url = new URL(route)
        if (
          url.protocol !== 'https:' ||
          !url.hostname ||
          url.username ||
          url.password ||
          url.hash ||
          /[\r\n\0]/.test(route)
        )
          throw new Error()
        route = url.href
      } catch {
        throw new Error(
          i18n(
            'Enter an HTTPS webhook URL without embedded credentials or a fragment.',
          ),
        )
      }
    }
    await preparePrivateFiles()
    await alertConfiguration.merge(effects, {
      enabled: input.enabled,
      webhook_url: route,
      generation: randomUUID(),
    })
    await sdk.action.clearTask(effects, 'atoll-recovery:configure-alerts')
    return {
      version: '1',
      title: i18n('Alert settings saved'),
      message: input.enabled
        ? i18n(
            'Start the service and confirm receiver acceptance in Recovery Status. HTTP acceptance does not prove a human read the notification.',
          )
        : i18n(
            'Notifications are disabled. Backup copies can continue; external alert delivery is not configured.',
          ),
      result: null,
    }
  },
)
