import * as fs from 'node:fs/promises'
import { sdk } from './sdk'

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
