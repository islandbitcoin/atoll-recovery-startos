import { i18n } from './i18n'
import { sdk } from './sdk'
import { configuration, remotes, alertConfiguration } from './fileModels/config'
import {
  mounts,
  preparePrivateFiles,
  prepareTrust,
  trustEnvironment,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  await preparePrivateFiles()
  const config = await configuration.read().const(effects)
  const stored = await remotes.read().const(effects)
  const alertSettings = await alertConfiguration.read().const(effects)
  if (
    !config?.source ||
    !config.destination ||
    !stored?.nextcloud.pass ||
    (config.source_kind === 'issuer'
      ? !config.issuer_origin || !config.issuer_id || !config.issuer_secret
      : !stored.r2.access_key_id || !stored.r2.secret_access_key)
  ) {
    return sdk.Daemons.of(effects)
  }
  const sub = sdk.SubContainer.of(
    effects,
    { imageId: 'runner' },
    mounts(),
    'copy-runner',
  )
  await prepareTrust(effects, sub)
  const daemons = sdk.Daemons.of(effects)
    .addDaemon('copy', {
      subcontainer: sub,
      exec: {
        command: [
          'python',
          '/opt/cashu-copy/copy.py',
          '--config',
          '/data/private/copy.json',
          '--state',
          '/data/state/copy.json',
        ],
        sigtermTimeout: 10_000,
        env: trustEnvironment,
      },
      ready: {
        display: i18n('Copy runner'),
        fn: async () => {
          const result = await sub.exec([
            'python',
            '-c',
            'from pathlib import Path; assert Path("/data/private/copy.json").is_file()',
          ])
          return {
            result: result.exitCode === 0 ? 'success' : 'failure',
            message:
              result.exitCode === 0
                ? i18n('Copy runner started')
                : i18n('Copy runner could not read its configuration'),
          }
        },
      },
      requires: [],
    })
    .addHealthCheck('independent-copy-freshness', {
      ready: {
        display: i18n('Independent copy freshness'),
        trigger: sdk.trigger.cooldownTrigger(60_000),
        fn: async () => {
          const result = await sub.exec([
            'python',
            '/opt/cashu-copy/copy.py',
            '--health',
            '--state',
            '/data/state/copy.json',
          ])
          try {
            const report: { status?: string } = JSON.parse(
              result.stdout.toString(),
            )
            if (result.exitCode === 0 && report.status === 'healthy')
              return {
                result: 'success',
                message: i18n('An independent copy is verified and fresh'),
              }
            if (report.status === 'warning')
              return {
                result: 'failure',
                message: i18n(
                  'The newest verified source is at least 18 hours old. Investigate before the 24-hour limit.',
                ),
              }
          } catch {
            /* Never echo raw child output. */
          }
          return {
            result: 'failure',
            message: i18n(
              'No healthy independent copy. Check transfer access, the export schedule and retained evidence.',
            ),
          }
        },
      },
      requires: ['copy'],
    })
  if (
    alertSettings?.enabled &&
    alertSettings.webhook_url &&
    alertSettings.generation
  ) {
    return daemons
      .addDaemon('alerts', {
        subcontainer: sub,
        exec: {
          command: [
            'python',
            '/opt/cashu-copy/alerts.py',
            '--config',
            '/data/private/alerts.json',
            '--copy-state',
            '/data/state/copy.json',
            '--state',
            '/data/state/alerts.json',
          ],
          sigtermTimeout: 10_000,
          env: trustEnvironment,
        },
        ready: {
          display: i18n('Notification watcher'),
          fn: async () => ({
            result: 'success',
            message: i18n('Notification watcher started'),
          }),
        },
        requires: [],
      })
      .addHealthCheck('alert-delivery', {
        ready: {
          display: i18n('Alert delivery evidence'),
          trigger: sdk.trigger.cooldownTrigger(60_000),
          fn: async () => {
            const result = await sub.exec([
              'python',
              '/opt/cashu-copy/alerts.py',
              '--health',
              '--config',
              '/data/private/alerts.json',
              '--copy-state',
              '/data/state/copy.json',
              '--state',
              '/data/state/alerts.json',
            ])
            return {
              result: result.exitCode === 0 ? 'success' : 'failure',
              message:
                result.exitCode === 0
                  ? i18n('The receiver recently accepted a notification')
                  : i18n(
                      'Notification delivery is unconfirmed or failing. Check Recovery Status and the receiver.',
                    ),
            }
          },
        },
        requires: ['alerts'],
      })
  }
  return daemons.addHealthCheck('alert-delivery', {
    ready: {
      display: i18n('Alert delivery evidence'),
      trigger: sdk.trigger.onceTrigger,
      gracePeriod: 0,
      fn: () => ({
        result: alertSettings?.enabled ? 'failure' : 'disabled',
        message: alertSettings?.enabled
          ? i18n(
              'Notification delivery is unconfirmed or failing. Check Recovery Status and the receiver.',
            )
          : i18n('Notifications are disabled'),
      }),
    },
    requires: [],
  })
})
