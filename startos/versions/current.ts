import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.3:0',
  releaseNotes: {
    en_US:
      'Pair issuer backups without R2 keys and authorize dedicated Nextcloud access in the browser',
    es_ES:
      'Vincula respaldos del emisor sin claves R2 y autoriza Nextcloud dedicado en el navegador',
    de_DE:
      'Verbindet Ausstellersicherungen ohne R2-Schlüssel und autorisiert Nextcloud im Browser',
    pl_PL:
      'Łączy kopie wystawcy bez kluczy R2 i autoryzuje osobne konto Nextcloud w przeglądarce',
    fr_FR:
      'Associe les sauvegardes sans clés R2 et autorise Nextcloud dédié dans le navigateur',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
