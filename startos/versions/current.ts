import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.6:2',
  releaseNotes: {
    en_US:
      'Keeps verified legacy archives without letting missing metadata block a newer eligible backup. An ineligible newest export still fails health; old files never certify freshness. Also upgrades pip to 26.2.2 and keeps distrusting the compromised eMudhra certificate authority.',
    es_ES:
      'Conserva archivos antiguos verificados sin que sus metadatos ausentes bloqueen una copia reciente válida. La exportación más reciente no válida sigue fallando; los archivos antiguos no certifican la vigencia.',
    de_DE:
      'Bewahrt geprüfte Altarchive, ohne dass fehlende Metadaten eine neuere gültige Sicherung blockieren. Ein ungeeigneter neuester Export bleibt fehlerhaft; alte Dateien belegen keine Aktualität.',
    pl_PL:
      'Zachowuje zweryfikowane starsze archiwa bez blokowania nowszej prawidłowej kopii z powodu brakujących metadanych. Nieprawidłowy najnowszy eksport nadal powoduje błąd; stare pliki nie potwierdzają aktualności.',
    fr_FR:
      'Conserve les archives anciennes vérifiées sans bloquer une sauvegarde récente admissible faute de métadonnées. Un export récent non admissible reste en échec ; les anciens fichiers ne prouvent pas la fraîcheur.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
