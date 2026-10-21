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
version is `0.1.0-beta.1:0`; it remains a prerelease until actual StartOS install,
action/task lifecycle and backup/restore checks succeed. The ops-service is a
separate package and has no runtime authority in this one.
