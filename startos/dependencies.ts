import { sdk } from './sdk'
import { i18n } from './i18n'

// Discovery reads exported interface metadata only; no credentials or volumes.
const nextcloud = sdk.Dependency.optional('nextcloud', {
  description: i18n('Connect Nextcloud'),
  metadata: {
    title: 'Nextcloud',
    icon: 'https://raw.githubusercontent.com/Start9Labs/nextcloud-startos/master/icon.svg',
  },
  versionRange: '>=35.0.1:3',
  kind: 'exists',
  enabled: async ({ effects }) =>
    (await sdk.getStatus(effects, { packageId: 'nextcloud' }).const()) !== null,
})

const ntfy = sdk.Dependency.optional('ntfy', {
  description: i18n('Connect NTFY'),
  metadata: {
    title: 'NTFY',
    icon: 'https://raw.githubusercontent.com/Start9Labs/ntfy-startos/master/icon.svg',
  },
  versionRange: '>=2.32.0:0',
  kind: 'exists',
  enabled: async ({ effects }) =>
    (await sdk.getStatus(effects, { packageId: 'ntfy' }).const()) !== null,
})

export const dependencies = sdk.Dependencies.of()
  .addDependency(nextcloud)
  .addDependency(ntfy)
