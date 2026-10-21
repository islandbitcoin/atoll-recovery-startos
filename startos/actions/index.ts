import { sdk } from '../sdk'
import { connectIssuer } from './connectIssuer'
import { connectNextcloud, finishNextcloud } from './connectNextcloud'
import { configure } from './configure'
import { configureAlerts } from './configureAlerts'
import { recoveryStatus } from './status'
export const actions = sdk.Actions.of()
  .addAction(connectIssuer)
  .addAction(connectNextcloud)
  .addAction(finishNextcloud)
  .addAction(configure)
  .addAction(configureAlerts)
  .addAction(recoveryStatus)
