import { sdk } from '../sdk'
import { i18n } from '../i18n'
import {
  configuration,
  remotes,
  alertConfiguration,
} from '../fileModels/config'
import { configure } from '../actions/configure'
import { configureAlerts } from '../actions/configureAlerts'
import { preparePrivateFiles } from '../utils'

export const requireConfiguration = sdk.setupOnInit(async (effects) => {
  await preparePrivateFiles()
  const config = await configuration.read().const(effects)
  const stored = await remotes.read().const(effects)
  if (
    !config?.source ||
    !config.destination ||
    !stored?.r2.access_key_id ||
    !stored.r2.secret_access_key ||
    !stored.nextcloud.pass
  ) {
    await sdk.action.createOwnTask(effects, configure, 'critical', {
      reason: i18n(
        'Configure dedicated backup transfer credentials before starting.',
      ),
    })
  } else {
    await sdk.action.clearTask(effects, 'atoll-recovery:configure')
  }
})

export const requireAlertChoice = sdk.setupOnInit(async (effects) => {
  const alerts = await alertConfiguration.read().const(effects)
  if (!alerts?.generation || (alerts.enabled && !alerts.webhook_url)) {
    await sdk.action.createOwnTask(effects, configureAlerts, 'important', {
      reason: i18n(
        'Choose notification routing or explicitly disable alerts before relying on recovery health.',
      ),
    })
  } else {
    await sdk.action.clearTask(effects, 'atoll-recovery:configure-alerts')
  }
})
