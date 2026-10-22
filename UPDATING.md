# Updating

The upstream is `lnflash/cashu-card`, specifically `tools/backup-copy/`. The
`upstream` git submodule pins the exact source commit; the initial package uses
the reviewed copy and notification implementation. Read `git submodule status`
for the exact source commit; `startos/versions/current.ts` owns the package version.

Before an update, review changes to the runner's JSON/INI configuration, state
schema, snapshot naming and health contract. Update the submodule deliberately,
then re-run upstream focused tests, local container transfer/persistence checks,
both architecture builds and StartOS installation/restore verification. Preserve
old state and remote snapshots. A changed backup location needs a reviewed state
migration, not clearing journals or reusing receipts against another destination.

The Dockerfile pins the Python multi-platform base by tag and manifest digest,
and pins each rclone architecture archive by SHA-256 from its upstream release.
Verify both supported architectures and all new digests against upstream before
changing pins. Keep `ARCHES` aligned with the manifest.

The package SDK is pinned in package.json/package-lock.json; check the published
SDK version and its minimum OS before updates. The current SDK declares minimum
StartOS `0.4.0.2`; the intended target is `0.4.0.3`. This metadata comparison does
not replace installation verification on that target.

Publishing uses the existing registered local signing identity. Build workflows create
unpublished test artifacts and hold no registry signing secret. Publish a prerelease
from the reviewed commit, then index those exact release assets in Atoll. Do not
replace an existing release asset or index a different build under its URL.

The packaging repository is `islandbitcoin/atoll-recovery-startos`. The initial
version is `0.1.0-beta.3:0`; it remains a prerelease until actual StartOS install,
action/task lifecycle and backup/restore checks succeed. The ops-service is a
separate package and has no runtime authority in this one.

The first prerelease created empty JSON configuration files during initialization.
Its successor seeds valid empty objects, including when recovering existing zero-byte
files, before SDK parsing. Nonempty files are preserved. The first-install CI smoke
checks real SDK reads, empty-file repair, private modes and preservation of existing
and malformed nonempty configuration; it does not simulate StartOS installation.

Paired setup introduces private `setup.json` and a temporary completed Nextcloud
authorization record. Both belong to the protected volume backup. Never remove
a successful authorization journal before its credential configuration is saved.
Existing manual R2 source configurations remain valid through defaults. Switching
a verified source or destination still requires a reviewed migration. The optional
Nextcloud dependency discovers only its exported `main`/`ui` HTTPS metadata.

## 0.1.0-beta.5

Paired source listing and download now identify themselves as Atoll Recovery,
matching the working pairing helper. The Cloudflare staging edge rejected
Python’s default user agent before invoking the Worker. Credentials, source and
destination locations, retained receipts and notification settings are preserved.
This fixes transport compatibility; it does not relax authentication or TLS.


## 0.1.0-beta.6

Pins the reviewed issuer receipt runner. `attest_copies` defaults to false through
the real SDK schema, preserving existing reader behavior and stable destination
manifests. The new stopped-service action changes only that setting; the issuer
administrator must separately grant authority. No state or credential migration
is needed. The prior CA distrust layer remains in the Dockerfile. Verify actual
StartOS upgrade, receipt authority and outage recovery before production use.


## 0.1.0-beta.6:1

Preserves verified legacy archives when receipt mode is enabled. Only an explicitly
ineligible older archive is skipped for attestation; a newest ineligible export,
authorization error or unsupported endpoint still fails health. State and immutable
manifest formats are unchanged. Existing receipt settings are retained.
