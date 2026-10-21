import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'atoll-recovery',
  title: 'Atoll Recovery',
  license: 'MIT',
  packageRepo: 'https://github.com/islandbitcoin/atoll-recovery-startos',
  upstreamRepo: 'https://github.com/lnflash/cashu-card',
  marketingUrl: 'https://getflash.io',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    runner: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
