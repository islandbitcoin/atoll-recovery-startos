import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.2:0',
  releaseNotes: {
    en_US:
      'Fix first-install JSON initialization and repair empty prerelease configuration',
    es_ES:
      'Corrige la inicialización JSON y repara la configuración vacía de prueba',
    de_DE:
      'Korrigiert die JSON-Erstinitialisierung und repariert leere Testkonfiguration',
    pl_PL: 'Naprawia inicjalizację JSON i pustą konfigurację wersji testowej',
    fr_FR:
      'Corrige l’initialisation JSON et répare la configuration de test vide',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
