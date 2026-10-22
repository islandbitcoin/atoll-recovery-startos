import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0-beta.6:0',
  releaseNotes: {
    en_US:
      'Adds optional verified-copy receipts. Existing readers remain read-only until a separate issuer grant and explicit configuration. Also stops trusting certificates from a compromised certificate authority (eMudhra).',
    es_ES:
      'Añade recibos opcionales de copias verificadas. Los lectores existentes siguen siendo de solo lectura hasta la autorización del emisor y la configuración explícita. Deja de confiar en los certificados de una autoridad de certificación comprometida (eMudhra).',
    de_DE:
      'Optionale Bestätigungen geprüfter Kopien. Bestehende Leser bleiben bis zur separaten Freigabe des Ausstellers und ausdrücklichen Konfiguration schreibgeschützt. Vertraut keinen Zertifikaten einer kompromittierten Zertifizierungsstelle mehr (eMudhra).',
    pl_PL:
      'Dodaje opcjonalne potwierdzenia zweryfikowanych kopii. Istniejące połączenia zachowują dostęp tylko do odczytu do osobnej zgody wystawcy i jawnej konfiguracji. Przestaje ufać certyfikatom ze skompromitowanego urzędu certyfikacji (eMudhra).',
    fr_FR:
      'Ajoute des reçus facultatifs de copies vérifiées. Les lecteurs existants restent en lecture seule sans autorisation distincte de l’émetteur et configuration explicite. Ne fait plus confiance aux certificats d’une autorité de certification compromise (eMudhra).',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
