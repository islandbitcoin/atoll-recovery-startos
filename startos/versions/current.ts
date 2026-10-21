import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.4:0',
  releaseNotes: {
    en_US:
      'Connect the existing Start9 NTFY service with a private write-only recovery publisher',
    es_ES:
      'Conecta NTFY de Start9 con un emisor privado de recuperación de solo escritura',
    de_DE:
      'Verbindet Start9 NTFY mit einem privaten Wiederherstellungsherausgeber mit Schreibrechten',
    pl_PL: 'Łączy Start9 NTFY z prywatnym nadawcą odzyskiwania tylko do zapisu',
    fr_FR:
      'Connecte NTFY de Start9 avec un éditeur privé de récupération en écriture seule',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
