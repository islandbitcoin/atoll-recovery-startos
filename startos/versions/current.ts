import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.5:0',
  releaseNotes: {
    en_US:
      'Fix Cloudflare compatibility for paired export listing and downloads',
    es_ES:
      'Corrige la compatibilidad con Cloudflare al listar y descargar exportaciones vinculadas',
    de_DE:
      'Behebt die Cloudflare-Kompatibilität beim Auflisten und Herunterladen verbundener Exporte',
    pl_PL:
      'Poprawia zgodność z Cloudflare podczas wyświetlania i pobierania powiązanych eksportów',
    fr_FR:
      'Corrige la compatibilité Cloudflare pour la liste et le téléchargement des exports associés',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
