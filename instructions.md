# Atoll Recovery

## Documentation

- [Cashu backup copy runner](https://github.com/lnflash/cashu-card/blob/main/tools/backup-copy/README.md) — copy verification and recovery boundaries.
- [Cashu recovery procedures](https://github.com/lnflash/cashu-card/blob/main/docs/OPS-RECOVERY-PLAN.md) — custody, restoration and reconciliation.

## What you get on StartOS

A background copier keeps encrypted Cashu ops exports in a dedicated Nextcloud directory and checks each copy by downloading it again. Its health display reports whether the newest verified source is recent enough. There is no web interface.

## Getting set up

1. Prepare R2 credentials restricted to reading and listing the dedicated backup bucket. Keep the bucket's `escrow/` prefix available.
2. Prepare a separate Nextcloud account with access only to backup data and create a revocable app password. Obtain its full HTTPS WebDAV URL from Nextcloud, ending in `/dav/files/USER/`. Its certificate must be trusted; do not disable TLS verification.
3. Complete **Configure Backup Copies**. Enter credentials privately in that form. Do not send them in chat or include a recovery private key. Use a new dedicated destination directory.
4. Complete **Configure Alerts** with a private HTTPS receiver URL, or explicitly disable notifications. The receiver must accept JSON POST requests and return a success status without redirecting.
5. Start the service. **Independent copy freshness** becomes healthy only after a destination copy and its verification manifest are read back successfully. If no export exists yet, wait for the approved exporter schedule and investigate continued failure.
6. Complete a separate authenticated restoration drill with a designated recovery operator before depending on these backups for production recovery.

## Using your backup copies

The copier checks on a 15-minute interval after each cycle. An export retains its original source timestamp; copying an old export again does not make it fresh. No previous snapshot is automatically deleted.

**Configure Backup Copies** also replaces transfer credentials for the same locations. It never returns saved passwords. After a verified copy exists, keep the R2 account, bucket, Nextcloud URL, username and destination directory fixed; moving backups requires an operator-reviewed migration so old verification receipts cannot certify a new location.

At 18 hours of source age the freshness display asks you to investigate. At 24 hours, on a failed copy, or when no check has completed for 30 minutes, health fails. Check transfer access, available storage and the export schedule. Do not delete evidence or overwrite conflicting copies to clear an error. A conflicting destination needs investigation.

## Recovery limits

**Recovery Status** shows source age, copy health and the last receiver acceptance without returning credentials. Enabled notifications send an initial status, status changes, hourly problem reminders and a daily healthy heartbeat. Failed delivery is retried after five minutes; redirects are rejected. Payloads contain event `atoll.recovery.health`, status, source age and a short text message, never credentials or backup contents. HTTP acceptance does not prove anyone read it.

The package cannot report when the whole package, host or network stops. Configure a receiver outside Zion to detect missing heartbeats; disabled notifications provide no external warning. This package does not automatically stop card issuance. A verified copy is not evidence that the recovery key can decrypt it or that a restored service is safe to reopen.

The recovery private identity stays in restricted Vaultwarden custody and the designated operator's protected offline copy outside Zion. Never put it in this service or Nextcloud. Backups of this service contain transfer credentials and verification state; protect access to them. They do not include the remote encrypted snapshots themselves.
