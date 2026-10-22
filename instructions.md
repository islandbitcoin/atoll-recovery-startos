# Atoll Recovery

## Documentation

- [Cashu backup copy runner](https://github.com/lnflash/cashu-card/blob/main/tools/backup-copy/README.md) — copy verification and recovery boundaries.
- [Cashu recovery procedures](https://github.com/lnflash/cashu-card/blob/main/docs/OPS-RECOVERY-PLAN.md) — custody, restoration and reconciliation.

## What you get on StartOS

A background copier keeps encrypted Cashu ops exports in a dedicated Nextcloud directory and checks each copy by downloading it again. Its health display reports whether the newest verified source is recent enough. There is no web interface.

## Getting set up

1. Ask the issuer recovery administrator to open the issuer’s `/ops/recovery/setup` page and create a pairing code. Enter the issuer HTTPS origin and that code in **Connect Issuer**. No R2 keys, bucket or account ID are needed.
2. Prepare a dedicated non-admin Nextcloud backup account. **Connect Nextcloud** prefills a locally discovered public HTTPS origin when available; otherwise enter the server origin. Run it, open its private authorization link, and sign in with the dedicated account. Do not authorize an administrator account. Then run **Finish Nextcloud Connection** to save the app password privately. The app password and WebDAV URL are filled automatically.
3. Complete **Configure Alerts** with a private HTTPS JSON receiver URL, or explicitly disable notifications. The receiver must accept JSON POST requests and return a success status without redirecting.
4. Start the service. **Independent copy freshness** becomes healthy only after an encrypted destination copy and its verification manifest are read back successfully. An empty issuer export list is not a verified backup; wait for the approved exporter schedule and investigate continued failure.
5. Complete a separate authenticated restoration drill with a designated recovery operator before relying on production recovery.

The issuer administrator can revoke the paired connection on the same approval page. The companion cannot trigger exports, provision cards, change custody or decrypt snapshots. Keep authorization links and codes out of chat and logs. If an action is interrupted, retry the same connection before starting another; completed Nextcloud authorization is journaled privately until configuration is committed. A lost issuer claim response can be retried with the same code while it remains valid.

Local Nextcloud discovery reads only exported connection metadata and does not create an account. Account creation is still a one-time administration step. A reviewed Nextcloud provisioning integration would be needed to automate that step safely.

### Optional issuer copy receipts

Copy receipts are off by default. To prepare an issuer that enforces backup
freshness, ask its recovery administrator to sign into `/ops/recovery/setup`,
refresh the connection list, and choose **Allow copy attestations** for this
reader. This permission lets Atoll report verified backups that may unblock
issuance; it does not verify a copy by itself.

Stop Atoll, run **Configure Copy Receipts**, enable receipts, and start Atoll.
Check Recovery Status and the issuer's backup health. Each receipt follows
successful read-back of both the encrypted artifact and its manifest. An issuer
without the new endpoint or permission fails the cycle; investigate rather than
clearing verification state. Disabling receipts is also a stopped-service action;
it does not remove the issuer's permission or make its issuance gate healthy.
Revoke that permission separately if needed. No R2 details or recovery key are
entered. Complete a reviewed staging drill before enabling production enforcement.

### Advanced direct R2 setup

**Advanced Transfer Setup** retains the manual scoped R2-to-Nextcloud path. Use a bucket-scoped Object Read only credential and a dedicated Nextcloud app password; never use an account-administration token. The Nextcloud URL must end in `/dav/files/USER/` and pass normal TLS checks. Moving between source modes after verified evidence exists requires a reviewed migration.

## Using your backup copies

The copier checks on a 15-minute interval after each cycle. An export retains its original source timestamp; copying an old export again does not make it fresh. No previous snapshot is automatically deleted.

**Advanced Transfer Setup** also replaces transfer credentials for the same locations. It never returns saved passwords. After a verified copy exists, keep the R2 account, bucket, Nextcloud URL, username and destination directory fixed; moving backups requires an operator-reviewed migration so old verification receipts cannot certify a new location.

At 18 hours of source age the freshness display asks you to investigate. At 24 hours, on a failed copy, or when no check has completed for 30 minutes, health fails. Check transfer access, available storage and the export schedule. Do not delete evidence or overwrite conflicting copies to clear an error. A conflicting destination needs investigation.

## Recovery limits

**Recovery Status** shows source age, copy health and the last receiver acceptance without returning credentials. Enabled notifications send an initial status, status changes, hourly problem reminders and a daily healthy heartbeat. Failed delivery is retried after five minutes; redirects are rejected. Payloads contain event `atoll.recovery.health`, status, source age and a short text message, never credentials or backup contents. HTTP acceptance does not prove anyone read it.

The package cannot report when the whole package, host or network stops. Configure a receiver outside Zion to detect missing heartbeats; disabled notifications provide no external warning. This package does not automatically stop card issuance. A verified copy is not evidence that the recovery key can decrypt it or that a restored service is safe to reopen.

The recovery private identity stays in restricted Vaultwarden custody and the designated operator's protected offline copy outside Zion. Never put it in this service or Nextcloud. Backups of this service contain transfer credentials and verification state; protect access to them. They do not include the remote encrypted snapshots themselves.

### NTFY notifications

Install NTFY from the Start9 Registry, initialize its admin account and configure
an HTTPS Web UI address. Run **Connect NTFY** in Atoll Recovery. It obtains a
dedicated write-only publisher privately; no token is pasted. Subscribe to
`atoll-recovery-health` with a separately authorized NTFY reader. Start Atoll and
confirm both Recovery Status acceptance and an actual received notification.
The publisher cannot read topics or administer NTFY. Use **Revoke Publisher** in
NTFY for `atoll-recovery` to withdraw its authority. Reconnect after revocation
requires using Configure Alerts to disable notifications, then Connect NTFY again.

A receiver on Zion cannot report Zion being offline. Independent monitoring and
an authenticated restore drill remain separate requirements.
