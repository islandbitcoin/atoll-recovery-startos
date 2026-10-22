import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.5:1',
  releaseNotes: {
    en_US:
      'Stops trusting certificates from a compromised certificate authority (eMudhra).',
    es_ES:
      'Deja de confiar en los certificados de una autoridad de certificación comprometida (eMudhra).',
    de_DE:
      'Vertraut keinen Zertifikate einer kompromittierten Zertifizierungsstelle mehr (eMudhra).',
    pl_PL:
      'Przestaje ufać certyfikatom ze skompromitowanego urzędu certyfikacji (eMudhra).',
    fr_FR:
      'Ne fait plus confiance aux certificats d’une autorité de certification compromise (eMudhra).',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
