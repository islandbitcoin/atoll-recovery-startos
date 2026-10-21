import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.1:0',
  releaseNotes: {
    en_US:
      'First Atoll test release: encrypted copies, source-time health and delivery alerts',
    es_ES:
      'Primera versión de prueba de Atoll: copias cifradas, vigencia y alertas',
    de_DE:
      'Erste Atoll-Testversion: verschlüsselte Kopien, Quellalter und Benachrichtigungen',
    pl_PL:
      'Pierwsza wersja testowa Atoll: szyfrowane kopie, wiek źródła i alerty',
    fr_FR:
      'Première version de test Atoll : copies chiffrées, âge de la source et alertes',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
