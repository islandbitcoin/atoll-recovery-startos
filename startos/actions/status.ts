import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { alertConfiguration } from '../fileModels/config'
import { mounts } from '../utils'

export const recoveryStatus = sdk.Action.withoutInput(
  'recovery-status',
  {
    name: i18n('Recovery Status'),
    description: i18n(
      'Read independent-copy health and notification acceptance without exposing credentials or decrypting backups.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  async ({ effects }) => {
    const alerts = await alertConfiguration.read().once()
    return sdk.SubContainer.withTemp(
      effects,
      { imageId: 'runner' },
      mounts(true),
      'recovery-status',
      async (sub) => {
        const copy = await sub.exec([
          'python',
          '/opt/cashu-copy/copy.py',
          '--health',
          '--state',
          '/data/state/copy.json',
        ])
        let copyStatus = 'failed'
        let age: number | null = null
        try {
          const report = JSON.parse(copy.stdout.toString())
          if (['healthy', 'warning', 'failed'].includes(report.status))
            copyStatus = report.status
          if (
            typeof report.source_age_seconds === 'number' &&
            Number.isFinite(report.source_age_seconds)
          )
            age = report.source_age_seconds
        } catch {
          /* Only validated fields become action results. */
        }
        let delivery = 'disabled'
        let accepted = i18n('No accepted notification recorded')
        if (alerts?.enabled) {
          delivery = 'failed'
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
          try {
            const report = JSON.parse(result.stdout.toString())
            if (result.exitCode === 0 && report.status === 'healthy')
              delivery = 'healthy'
            if (
              typeof report.last_delivered_at === 'number' &&
              Number.isFinite(report.last_delivered_at)
            )
              accepted = new Date(report.last_delivered_at * 1000).toISOString()
          } catch {
            /* Never return raw child output. */
          }
        }
        const label = (status: string) =>
          status === 'healthy'
            ? i18n('Healthy')
            : status === 'warning'
              ? i18n('Needs attention')
              : status === 'disabled'
                ? i18n('Disabled')
                : i18n('Failed')
        const field = (name: string, value: string) => ({
          type: 'single' as const,
          name,
          description: null,
          value,
          masked: false,
          copyable: true,
          qr: false,
          launchable: false,
        })
        return {
          version: '1',
          title: i18n('Recovery Status'),
          message: i18n(
            'Copy verification and receiver acceptance are separate from an authenticated restore drill.',
          ),
          result: {
            type: 'group',
            value: [
              field(i18n('Independent copy freshness'), label(copyStatus)),
              field(
                i18n('Source snapshot age'),
                age === null
                  ? i18n('Unknown')
                  : String(Math.max(0, Math.floor(age / 3600))) +
                      ' ' +
                      i18n('hours'),
              ),
              field(i18n('Alert delivery evidence'), label(delivery)),
              field(i18n('Last notification accepted'), accepted),
            ],
          },
        }
      },
    )
  },
)
