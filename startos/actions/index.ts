import { sdk } from '../sdk'
import { configure } from './configure'
import { configureAlerts } from './configureAlerts'
import { recoveryStatus } from './status'
export const actions = sdk.Actions.of()
  .addAction(configure)
  .addAction(configureAlerts)
  .addAction(recoveryStatus)
