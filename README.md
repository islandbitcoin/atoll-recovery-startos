<p align="center">
  <img src="icon.png" alt="Atoll icon" width="21%" />
</p>

# Atoll Recovery on StartOS

> Everything not listed here should behave as the upstream Cashu backup copy
> runner. See the Documentation section of `instructions.md` for upstream details.

This package wraps the issuer service's independent encrypted backup copier.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

## Image and Container Runtime

A custom Dockerfile combines a digest-pinned Python Alpine base, checksum-pinned
rclone binaries and unmodified runner source from the `upstream` submodule.
The `copy-runner` subcontainer runs the Python loop directly as root with private
file permissions; it has no supervisor or extra kernel/device requirements.
The image supports x86_64 and aarch64. No runtime package download is performed.

## Volume and Data Layout

The `main` volume mounts at `/data`. Its `private/` directory holds `rclone.conf`
`copy.json` , `alerts.json` and the private setup journal; `state/` holds copy and notification receipts and writer locks. Both directories
are restricted to their owner, and the configuration files are owner-readable
and writable only. Temporary downloaded exports live in a private ephemeral
directory and disappear after a cycle; remote snapshots are outside this volume.

## File Models

The private setup journal records pending issuer claims and Nextcloud browser authorization. A successful Nextcloud poll is retained privately until credential configuration commits.

The package directly models `private/rclone.conf` as INI and `private/copy.json`
and `private/alerts.json` as JSON. Initial setup seeds private file metadata before atomic model writes.
The configuration action merges R2 and Nextcloud fields and the two scoped
remote directories. Runtime readers react to model changes. Unknown INI/JSON
keys survive model merges; owned transport type, provider and local config path
are enforced by the schema. Manual edits are not a supported location-migration
path. The upstream runners own `state/copy.json` and `state/alerts.json`; it is not a configuration
model and must not be regenerated to clear a health failure.

## Dependencies

An optional local Nextcloud dependency activates when installed, for exported HTTPS interface discovery. Remote Nextcloud remains supported. No service credentials or volumes are read through discovery. The runner needs outbound
access to the configured R2 bucket and Nextcloud account. It does not mount or
modify another service's volume and does not require Vaultwarden access.

## Network Access and Interfaces

No inbound interfaces or listening ports are exposed. R2 and Nextcloud transfers
and paired issuer requests use outbound HTTPS; the Nextcloud certificate must pass normal trust checks.
The copy runner and setup helpers retain the image’s public CA roots and add this StartOS server’s root in ephemeral container storage, so local HTTPS origins can be verified without disabling TLS. The package creates no public endpoint and does not change either remote service.

## Installation and First-Run Flow

Initialization creates private directories and watches both configuration models.
A critical setup prompt blocks useful operation until dedicated transfer
credentials exist. No source or destination is contacted just by installing the
unconfigured package. No credentials, backup destination or recovery key are
auto-discovered from the server.

## Actions

**Connect Issuer** saves a device secret before claiming an expiring pairing code. The paired credential reads existing encrypted exports; R2 details are not entered. **Connect Nextcloud** discovers/prefills the local public HTTPS origin when available and returns a private browser approval link. **Finish Nextcloud Connection** collects and journals the result privately, rejects administrator credentials, preserves locations and saves the app password without returning it. A committed journal can finish cleanup after interruption. A dedicated non-admin account must already exist; discovery does not create one.

Advanced Transfer Setup establishes the source and destination manually and can subsequently
replace credentials while the service is stopped. It does not make a transfer
or certify that supplied access works. Saved secrets are not prefilled or
returned. **Configure Alerts** selects an HTTPS JSON receiver or explicitly disables notifications while stopped. Every routing change resets delivery confirmation. **Recovery Status** returns only copy health, source age and notification acceptance evidence, including while stopped. The Nextcloud password is obscured through rclone over stdin before
INI storage; obscuring is not encryption, so filesystem permissions still matter.
Endpoint/account/bucket/user/directory changes are rejected once verified evidence exists to
prevent stale receipts from being reused for a different destination.

**Configure Copy Receipts** explicitly enables or disables issuer attestations while
stopped. It defaults to off for new and existing configurations. Enabling requires
a paired issuer, whose recovery administrator must separately grant copy
attestation on the issuer approval page. The runner submits only after destination
ciphertext and manifest read-back. Delivery failure fails the cycle and retries
immutable artifacts; accepted issuer snapshot time drives health. Older verified
archives without metadata remain stored without invalidating a newer eligible
snapshot; an ineligible newest export fails health. No source,
destination or credential changes accompany this action. Installed-package
behavior still requires a bounded StartOS upgrade/drill; compilation and container
checks alone do not establish it.

## Tasks

Critical Connect Issuer and Connect Nextcloud tasks appear while the corresponding configuration is absent. Existing manual configurations satisfy these checks; the old combined setup task is cleared.
The same configuration action satisfies it. Initialization clears its replay key
when configuration is complete, including after restoration. There are no
cross-service tasks or generated admin accounts. An important setup task remains until an explicit notification choice is saved.

## Health Checks

Daemon readiness confirms the running container can read its configuration; it
is separate from `independent-copy-freshness`. The latter runs the upstream
health command at a reduced polling frequency and passes only for healthy
source-time evidence. A warning is presented as a failed health check with an
explicit warning message because the health ABI has no warning state. A stopped
runner's old health evidence expires independently. Raw child output and
provider errors are never included in health messages. Optional notification monitoring runs separately from the copy loop. Alert-delivery health checks recent receiver acceptance; disabled routing is shown as disabled. HTTP acceptance does not prove a human saw a notification.

## Backups and Restore

StartOS backups include the entire `main` volume: configuration, scoped transfer
credentials and verification receipts. The normal backup lifecycle stops the
service around the volume snapshot. Treat these backups as sensitive. Restoring
reuses the same locations and credentials; revoked credentials must be replaced
through configuration. The restored runner must regain fresh independent-copy
evidence. Nextcloud ciphertext objects and the recovery private identity are not
included in this service's backup. No authenticated escrow restore is performed.

## Limitations and Differences

The operational boundaries below must remain explicit when assessing readiness.

1. This setup-flow candidate has not yet been installed on Zion. The previous prerelease installed and its unconfigured status and manual setup actions ran successfully. StartOS setup/task handling,
   paired issuer access, browser authorization and a StartOS backup/restore round trip remain
   unverified until an approved server test.
2. There is no automatic issuance fence. HTTPS notifications cannot report loss of the whole package, host or network; an independently hosted monitor must detect missed heartbeats. Displayed health does not enforce the production recovery objective.
3. Setup accepts only the dedicated scoped R2 and Nextcloud shape, not arbitrary
   rclone remotes. Backend TLS verification is not disabled.
4. Location changes after verified evidence exists require a reviewed migration. Do not bypass that guard by
   deleting local receipts or remote snapshots.
5. A copy hash does not authenticate age ciphertext or its recovery recipient;
   a designated operator must complete the separate authenticated restore drill.

## Quick Reference for AI Consumers

This block identifies the package's operational surface.

```yaml
package_id: atoll-recovery
image: custom Dockerfile from Python and rclone
architectures: [x86_64, aarch64]
subcontainers: [copy-runner]
volumes:
  main: /data
file_models:
  - private/rclone.conf
  - private/copy.json
  - private/alerts.json
  - private/setup.json
startos_managed_env_vars: []
dependencies: optional local nextcloud
interfaces: {}
actions:
  [
    connect-issuer,
    configure-copy-receipts,
    connect-nextcloud,
    finish-nextcloud,
    configure,
    configure-alerts,
    connect-ntfy,
    recovery-status,
  ]
tasks:
  - { action: connect-issuer, severity: critical }
  - { action: connect-nextcloud, severity: critical }
  - { action: configure-alerts, severity: important }
health_checks: [copy, independent-copy-freshness, alerts, alert-delivery]
```

### Scoped NTFY connection

**Connect NTFY** uses the installed Start9 NTFY package’s dependent publisher
action, reads only its exported HTTPS interface metadata and privately saves a
write-only token for `atoll-recovery-health`. It never reads NTFY volumes or its
admin password. Generic Configure Alerts remains available and clears a prior
NTFY token when switching routing. Subscribers need their own read permission.
