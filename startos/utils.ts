import * as fs from 'node:fs/promises'
import { sdk } from './sdk'
import { i18n } from './i18n'
import { randomUUID } from 'node:crypto'
import { additionalIssuers, type AdditionalIssuer } from './fileModels/issuers'

export function issuerPaths(id: string) {
  return {
    config: `/data/private/issuers/${id}/copy.json`,
    state: `/data/state/issuers/${id}/copy.json`,
    alerts: `/data/private/issuers/${id}/alerts.json`,
    alertState: `/data/state/issuers/${id}/alerts.json`,
  }
}

// Materialize only runtime configuration. Never initialize, replace or delete
// any profile's copy/notification evidence when its credentials are refreshed.
export async function prepareIssuerFiles(
  profile: AdditionalIssuer,
  alerts: Record<string, unknown>,
) {
  for (const prefix of ['private', 'state']) {
    const directory = sdk.volumes.main.subpath(
      `${prefix}/issuers/${profile.id}`,
    )
    await fs.mkdir(directory, { recursive: true, mode: 0o700 })
    await fs.chmod(directory, 0o700)
  }
  const write = async (name: string, value: unknown) => {
    const target = sdk.volumes.main.subpath(
      `private/issuers/${profile.id}/${name}`,
    )
    const temporary = target + '.' + randomUUID()
    await fs.writeFile(temporary, JSON.stringify(value) + '\n', {
      mode: 0o600,
      flag: 'wx',
    })
    await fs.rename(temporary, target)
  }
  await write('copy.json', {
    rclone_config: '/data/private/rclone.conf',
    source_kind: 'issuer',
    source: 'issuer:' + profile.issuer_id,
    issuer_origin: profile.issuer_origin,
    issuer_id: profile.issuer_id,
    issuer_secret: profile.issuer_secret,
    attest_copies: profile.attest_copies,
    destination: profile.destination,
  })
  await write('alerts.json', {
    ...alerts,
    label: profile.label,
    generation: String(alerts.generation ?? '') + ':' + profile.id,
  })
}

export const mounts = (readonly = false) =>
  sdk.Mounts.of().mountVolume({
    volumeId: 'main',
    subpath: null,
    mountpoint: '/data',
    readonly,
  })

// Seed restrictive metadata before FileHelper's atomic writes preserve it.
export async function preparePrivateFiles() {
  for (const folder of ['private', 'state']) {
    const directory = sdk.volumes.main.subpath(folder)
    await fs.mkdir(directory, { recursive: true, mode: 0o700 })
    await fs.chmod(directory, 0o700)
  }
  for (const name of [
    'private/rclone.conf',
    'private/copy.json',
    'private/alerts.json',
    'private/setup.json',
    'private/additional-issuers.json',
  ]) {
    const file = sdk.volumes.main.subpath(name)
    let existing = true
    try {
      await fs.stat(file)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        existing = false
      else throw error
    }
    // An existing empty JSON file from the first prerelease also needs a
    // document before FileHelper parses it. Never rewrite nonempty config.
    const handle = await fs.open(file, 'a+', 0o600)
    try {
      await handle.chmod(0o600)
      if (name.endsWith('.json') && (await handle.stat()).size === 0) {
        // This registry never existed in the empty-file prerelease. Repairing
        // a truncated registry would silently forget enrolled backup sources.
        if (existing && name === 'private/additional-issuers.json')
          throw new Error(
            i18n(
              'Connection failed. Check approval, origin and network access.',
            ),
          )
        await handle.writeFile('{}\n')
      }
    } finally {
      await handle.close()
    }
  }
}

// Missing state permits setup corrections. Corrupt/unreadable evidence locks
// retargeting conservatively; it must never be treated as an empty history.
export async function hasVerifiedEvidence() {
  // Additional issuers share the primary Nextcloud account. Once enrolled,
  // those remote coordinates must not change through primary setup actions.
  try {
    if ((await additionalIssuers.read().once())?.profiles.length) return true
  } catch {
    return true
  }
  try {
    const state = JSON.parse(
      await fs.readFile(sdk.volumes.main.subpath('state/copy.json'), 'utf8'),
    )
    return (
      state.version !== 1 ||
      !state.verified ||
      typeof state.verified !== 'object' ||
      state.latest !== null ||
      Array.isArray(state.verified) ||
      Object.keys(state.verified).length > 0
    )
  } catch (error) {
    return !(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )
  }
}

// stdout is a private machine channel and may contain an app password.
// Return only parsed results to callers; never forward child text to the UI.
export async function connectionRequest(
  effects: Parameters<typeof sdk.SubContainer.withTemp>[0],
  operation: 'pair-issuer' | 'nextcloud-start' | 'nextcloud-finish',
  input: Record<string, unknown>,
): Promise<unknown> {
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'runner' },
    mounts(),
    'connection-setup',
    async (sub) => {
      await prepareTrust(effects, sub)
      const command = ['python', '/opt/cashu-copy/connect.py', operation]
      if (operation === 'nextcloud-finish')
        command.push('--result-file', '/data/private/nextcloud-authorized.json')
      const result = await sub.exec(command, {
        input: JSON.stringify(input),
        env: trustEnvironment,
        timeout: 120_000,
      })
      if (result.exitCode !== 0)
        throw new Error(
          i18n('Connection failed. Check approval, origin and network access.'),
        )
      try {
        return JSON.parse(result.stdout.toString())
      } catch {
        throw new Error(
          i18n('Connection failed. Check approval, origin and network access.'),
        )
      }
    },
  )
}

export function secureOrigin(value: string) {
  try {
    const url = new URL(value.trim())
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error()
    return url.origin
  } catch {
    throw new Error(
      i18n(
        'Enter an HTTPS server origin without a path, credentials, query or fragment.',
      ),
    )
  }
}

export const trustEnvironment = { SSL_CERT_FILE: '/tmp/atoll-ca.pem' }

// Keep public roots and add this StartOS server's root for local HTTPS origins.
// Regenerate in the subcontainer rootfs; certificates do not belong in backups.
export async function prepareTrust(
  effects: Parameters<typeof sdk.SubContainer.withTemp>[0],
  sub: {
    exec(
      command: string[],
    ): Promise<{ exitCode: number | null; stdout: { toString(): string } }>
    writeFile(path: string, data: string): Promise<void>
  },
) {
  const roots = await sub.exec([
    'python',
    '-c',
    'from pathlib import Path; print(Path("/etc/ssl/cert.pem").read_text(), end="")',
  ])
  if (roots.exitCode !== 0)
    throw new Error(
      i18n('Connection failed. Check approval, origin and network access.'),
    )
  await sub.writeFile(
    trustEnvironment.SSL_CERT_FILE,
    roots.stdout.toString() + '\n' + (await sdk.getRootCa(effects)),
  )
}
