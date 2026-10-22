import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.7:0',
  releaseNotes: {
    en_US:
      'Adds separate issuer connections, destinations, copy history, health checks and named notifications while preserving existing backups. Re-pair the same coordinates to rotate an additional reader without clearing evidence.',
    es_ES:
      'Añade conexiones, destinos, historiales, controles de estado y avisos independientes por emisor, conservando las copias existentes. Vuelva a vincular las mismas ubicaciones para rotar un lector adicional sin borrar pruebas.',
    de_DE:
      'Ergänzt separate Ausstellerverbindungen, Ziele, Kopierverläufe, Zustandsprüfungen und benannte Meldungen, ohne vorhandene Sicherungen zu ändern. Erneutes Verbinden derselben Speicherorte erneuert einen zusätzlichen Leser ohne Löschen der Nachweise.',
    pl_PL:
      'Dodaje osobne połączenia wystawców, lokalizacje, historie kopii, kontrole stanu i nazwane powiadomienia, zachowując istniejące kopie. Ponowne sparowanie tych samych lokalizacji odnawia dodatkowego czytelnika bez usuwania dowodów.',
    fr_FR:
      'Ajoute des connexions, destinations, historiques, contrôles et notifications distincts par émetteur en conservant les sauvegardes existantes. Réassociez les mêmes emplacements pour renouveler un lecteur supplémentaire sans effacer les preuves.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
