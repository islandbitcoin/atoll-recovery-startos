import { sdk } from '../sdk'
import { i18n } from '../i18n'
import {
  configuration,
  remotes,
  alertConfiguration,
} from '../fileModels/config'
import { connectIssuer } from '../actions/connectIssuer'
import { connectNextcloud } from '../actions/connectNextcloud'
import { configureAlerts } from '../actions/configureAlerts'
import { preparePrivateFiles } from '../utils'

export const requireConfiguration = sdk.setupOnInit(async (effects) => {
  await preparePrivateFiles()
  const config = await configuration.read().const(effects)
  const stored = await remotes.read().const(effects)
  const sourceReady =
    config?.source &&
    (config.source_kind === 'issuer'
      ? config.issuer_origin && config.issuer_id && config.issuer_secret
      : stored?.r2.access_key_id && stored.r2.secret_access_key)
  if (!sourceReady) {
    await sdk.action.createOwnTask(effects, connectIssuer, 'critical', {
      reason: i18n(
        'Pair the issuer before starting. Advanced R2 setup is available as a fallback.',
      ),
    })
  } else {
    await sdk.action.clearTask(effects, 'atoll-recovery:connect-issuer')
  }
  if (
    !config?.destination ||
    !stored?.nextcloud.url ||
    !stored.nextcloud.user ||
    !stored.nextcloud.pass
  ) {
    await sdk.action.createOwnTask(effects, connectNextcloud, 'critical', {
      reason: i18n(
        'Authorize a dedicated Nextcloud backup account before starting.',
      ),
    })
  } else {
    await sdk.action.clearTask(effects, 'atoll-recovery:connect-nextcloud')
  }
  await sdk.action.clearTask(effects, 'atoll-recovery:configure')
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
