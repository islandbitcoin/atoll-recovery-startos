import { i18n } from './i18n'
import { sdk } from './sdk'
import { configuration, remotes, alertConfiguration } from './fileModels/config'
import { additionalIssuers } from './fileModels/issuers'
import {
  mounts,
  preparePrivateFiles,
  prepareTrust,
  trustEnvironment,
  prepareIssuerFiles,
  issuerPaths,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  await preparePrivateFiles()
  const config = await configuration.read().const(effects)
  const stored = await remotes.read().const(effects)
  const alertSettings = await alertConfiguration.read().const(effects)
  const additional = await additionalIssuers.read().const(effects)
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
  const profiles = [
    {
      id: '',
      label: '',
      config: '/data/private/copy.json',
      state: '/data/state/copy.json',
      alerts: '/data/private/alerts.json',
      alertState: '/data/state/alerts.json',
    },
  ]
  for (const profile of additional?.profiles ?? []) {
    // Revalidate the shared destination boundary on every start, including
    // restored configuration. No profile may reuse another profile's evidence.
    if (
      profile.destination.toLowerCase() === config.destination.toLowerCase() ||
      profile.issuer_origin === config.issuer_origin ||
      profile.issuer_id === config.issuer_id
    )
      throw new Error(
        i18n(
          'Choose a distinct backup name, issuer and directory. Existing locations cannot be replaced.',
        ),
      )
    await prepareIssuerFiles(profile, alertSettings ?? {})
    profiles.push({
      id: profile.id,
      label: profile.label,
      ...issuerPaths(profile.id),
    })
  }
  // Erase accumulated type-level IDs between dynamic UUID entries. The schema
  // guarantees unique profile IDs; every daemon/check has a distinct prefix.
  let daemons = sdk.Daemons.of(effects)
  for (const profile of profiles) {
    const suffix = profile.id ? '-' + profile.id : ''
    const named = (value: string) =>
      value + (profile.label ? ': ' + profile.label : '')
    const copyId = ('copy' + suffix) as `copy${string}`
    const alertId = ('alerts' + suffix) as `alerts${string}`
    daemons = daemons
      .addDaemon(copyId, {
        subcontainer: sub,
        exec: {
          command: [
            'python',
            '/opt/cashu-copy/copy.py',
            '--config',
            profile.config,
            '--state',
            profile.state,
          ],
          sigtermTimeout: 10_000,
          env: trustEnvironment,
        },
        ready: {
          display: named(i18n('Copy runner')),
          fn: async () => {
            const result = await sub.exec([
              'python',
              '-c',
              `from pathlib import Path; assert Path(${JSON.stringify(profile.config)}).is_file()`,
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
      .addHealthCheck(
        ('independent-copy-freshness' +
          suffix) as `independent-copy-freshness${string}`,
        {
          ready: {
            display: named(i18n('Independent copy freshness')),
            trigger: sdk.trigger.cooldownTrigger(60_000),
            fn: async () => {
              const result = await sub.exec([
                'python',
                '/opt/cashu-copy/copy.py',
                '--health',
                '--state',
                profile.state,
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
          requires: [copyId],
        },
      ) as typeof daemons
    if (
      alertSettings?.enabled &&
      alertSettings.webhook_url &&
      alertSettings.generation
    ) {
      daemons = daemons
        .addDaemon(alertId, {
          subcontainer: sub,
          exec: {
            command: [
              'python',
              '/opt/cashu-copy/alerts.py',
              '--config',
              profile.alerts,
              '--copy-state',
              profile.state,
              '--state',
              profile.alertState,
            ],
            sigtermTimeout: 10_000,
            env: trustEnvironment,
          },
          ready: {
            display: named(i18n('Notification watcher')),
            fn: async () => ({
              result: 'success',
              message: i18n('Notification watcher started'),
            }),
          },
          requires: [],
        })
        .addHealthCheck(
          ('alert-delivery' + suffix) as `alert-delivery${string}`,
          {
            ready: {
              display: named(i18n('Alert delivery evidence')),
              trigger: sdk.trigger.cooldownTrigger(60_000),
              fn: async () => {
                const result = await sub.exec([
                  'python',
                  '/opt/cashu-copy/alerts.py',
                  '--health',
                  '--config',
                  profile.alerts,
                  '--copy-state',
                  profile.state,
                  '--state',
                  profile.alertState,
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
            requires: [alertId],
          },
        ) as typeof daemons
    } else {
      daemons = daemons.addHealthCheck(
        ('alert-delivery' + suffix) as `alert-delivery${string}`,
        {
          ready: {
            display: named(i18n('Alert delivery evidence')),
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
        },
      ) as typeof daemons
    }
  }
  return daemons
})
