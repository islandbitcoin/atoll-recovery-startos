import * as fs from 'node:fs/promises'
import { sdk } from './sdk'
import { i18n } from './i18n'

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
  ]) {
    const file = sdk.volumes.main.subpath(name)
    // An existing empty JSON file from the first prerelease also needs a
    // document before FileHelper parses it. Never rewrite nonempty config.
    const handle = await fs.open(file, 'a+', 0o600)
    try {
      await handle.chmod(0o600)
      if (name.endsWith('.json') && (await handle.stat()).size === 0) {
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
