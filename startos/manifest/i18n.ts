export const short = {
  en_US: 'Verified independent copies of encrypted Cashu ops backups',
  es_ES: 'Copias independientes verificadas de respaldos cifrados de Cashu',
  de_DE: 'Geprüfte unabhängige Kopien verschlüsselter Cashu-Sicherungen',
  pl_PL: 'Zweryfikowane niezależne kopie szyfrowanych kopii Cashu',
  fr_FR: 'Copies indépendantes vérifiées des sauvegardes chiffrées Cashu',
}

export const long = {
  en_US:
    'Copies encrypted Cashu ops exports from a scoped R2 bucket to a dedicated Nextcloud directory. Downloads and verifies each destination copy, retains prior evidence and reports source-time freshness. Holds transfer credentials, never the private recovery identity. Requires access to configured R2 and Nextcloud endpoints; Optional HTTPS notifications report copy health; authenticated restore and issuance enforcement remain separate operational requirements.',
  es_ES:
    'Copia exportaciones cifradas de Cashu desde un bucket R2 limitado a un directorio dedicado de Nextcloud. Descarga y verifica cada copia, conserva pruebas y muestra su vigencia según el origen. Guarda credenciales de transferencia, nunca la identidad privada de recuperación. Requiere acceso a R2 y Nextcloud; incluye alertas HTTPS opcionales; la restauración autenticada y el control de emisión son requisitos separados.',
  de_DE:
    'Kopiert verschlüsselte Cashu-Exporte aus einem eingeschränkten R2-Bucket in ein eigenes Nextcloud-Verzeichnis. Lädt Zielkopien zur Prüfung herunter, erhält Nachweise und meldet deren Quellalter. Speichert Transferzugangsdaten, niemals die private Wiederherstellungsidentität. Benötigt R2- und Nextcloud-Zugriff; optionale HTTPS-Meldungen zeigen den Kopierstatus; authentifizierte Wiederherstellung und Ausgabesperren sind getrennte Anforderungen.',
  pl_PL:
    'Kopiuje szyfrowane eksporty Cashu z ograniczonego zasobnika R2 do dedykowanego katalogu Nextcloud. Pobiera i weryfikuje kopie docelowe, zachowuje dowody i zgłasza wiek źródła. Przechowuje dane transferu, nigdy prywatny klucz odzyskiwania. Wymaga dostępu do R2 i Nextcloud; opcjonalne powiadomienia HTTPS zgłaszają stan kopii; uwierzytelnione odtworzenie i blokada wydawania są osobnymi wymaganiami.',
  fr_FR:
    'Copie les exports chiffrés Cashu depuis un bucket R2 restreint vers un répertoire Nextcloud dédié. Télécharge et vérifie chaque copie, conserve les preuves et indique l’âge de la source. Conserve les identifiants de transfert, jamais l’identité privée de récupération. Nécessite l’accès à R2 et Nextcloud ; les notifications HTTPS facultatives signalent l’état des copies ; la restauration authentifiée et le contrôle des émissions restent des exigences distinctes.',
}
