import { configureCopyReceipts } from './configureCopyReceipts'
import { connectNtfy } from './connectNtfy'
import { sdk } from '../sdk'
import { connectIssuer } from './connectIssuer'
import { connectAdditionalIssuer } from './connectAdditionalIssuer'
import { connectNextcloud, finishNextcloud } from './connectNextcloud'
import { configure } from './configure'
import { configureAlerts } from './configureAlerts'
import { recoveryStatus } from './status'
export const actions = sdk.Actions.of()
  .addAction(connectIssuer)
  .addAction(connectAdditionalIssuer)
  .addAction(configureCopyReceipts)
  .addAction(connectNextcloud)
  .addAction(finishNextcloud)
  .addAction(configure)
  .addAction(configureAlerts)
  .addAction(connectNtfy)
  .addAction(recoveryStatus)
