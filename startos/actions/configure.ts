import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { configuration, remotes } from '../fileModels/config'
import { hasVerifiedEvidence, preparePrivateFiles } from '../utils'

const { InputSpec, Value } = sdk
export const configure = sdk.Action.withInput(
  'configure',
  {
    name: i18n('Advanced Transfer Setup'),
    description: i18n(
      'Set scoped R2 read credentials and a dedicated Nextcloud app password. Reuse this action to rotate credentials; locations stay fixed after verification.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    account: Value.text({
      name: i18n('Cloudflare account ID'),
      required: true,
      default: null,
      patterns: [
        {
          regex: '[a-f0-9]{32}',
          description: i18n('Use the 32-character account ID.'),
        },
      ],
    }),
    bucket: Value.text({
      name: i18n('R2 backup bucket'),
      required: true,
      default: null,
      patterns: [
        {
          regex: '[a-z0-9][a-z0-9-]{1,61}[a-z0-9]',
          description: i18n('Use the dedicated R2 backup bucket name.'),
        },
      ],
    }),
    accessKey: Value.text({
      name: i18n('R2 read access key ID'),
      required: true,
      default: null,
      masked: true,
    }),
    secretKey: Value.text({
      name: i18n('R2 read secret access key'),
      required: true,
      default: null,
      masked: true,
    }),
    webdavUrl: Value.text({
      name: i18n('Nextcloud WebDAV HTTPS URL'),
      required: true,
      default: null,
    }),
    username: Value.text({
      name: i18n('Dedicated Nextcloud username'),
      required: true,
      default: null,
    }),
    password: Value.text({
      name: i18n('Nextcloud app password'),
      required: true,
      default: null,
      masked: true,
    }),
    directory: Value.text({
      name: i18n('Nextcloud backup directory'),
      required: true,
      default: 'atoll-recovery',
      patterns: [
        {
          regex: '[a-zA-Z0-9_-]{1,80}',
          description: i18n(
            'Use a single directory name with letters, digits, hyphens or underscores.',
          ),
        },
      ],
    }),
  }),
  async () => {
    const config = await configuration.read().once()
    const stored = await remotes.read().once()
    return {
      account: stored?.r2.endpoint.match(
        /^https:\/\/([a-f0-9]{32})\.r2\.cloudflarestorage\.com$/,
      )?.[1],
      bucket: config?.source.match(/^r2:([^/]+)\/escrow$/)?.[1],
      webdavUrl: stored?.nextcloud.url,
      username: stored?.nextcloud.user,
      directory: config?.destination.replace(/^nextcloud:/, ''),
    }
  },
  async ({ effects, input }) => {
    if (Object.values(input).some((v) => !v.trim() || /[\r\n\0]/.test(v))) {
      throw new Error(i18n('Complete every field without line breaks.'))
    }
    let url: URL
    try {
      url = new URL(input.webdavUrl)
    } catch {
      throw new Error(
        i18n(
          'Use the HTTPS Nextcloud URL ending in /dav/files/USER, without embedded credentials, query or fragment.',
        ),
      )
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/\/dav\/files\/[^/]+\/?$/.test(url.pathname)
    ) {
      throw new Error(
        i18n(
          'Use the HTTPS Nextcloud URL ending in /dav/files/USER, without embedded credentials, query or fragment.',
        ),
      )
    }
    const endpoint = `https://${input.account}.r2.cloudflarestorage.com`
    const source = `r2:${input.bucket}/escrow`
    const destination = `nextcloud:${input.directory}`
    const old = await configuration.read().once()
    const stored = await remotes.read().once()
    if (
      old?.source &&
      (await hasVerifiedEvidence()) &&
      (source !== old.source ||
        destination !== old.destination ||
        endpoint !== stored?.r2.endpoint ||
        url.href !== stored?.nextcloud.url ||
        input.username !== stored?.nextcloud.user)
    ) {
      throw new Error(
        i18n(
          'Backup locations with verified evidence are fixed. Changing them requires a reviewed migration.',
        ),
      )
    }
    const obscured = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'runner' },
      sdk.Mounts.of(),
      'obscure-password',
      async (sub) => {
        const result = await sub.exec(['rclone', 'obscure', '-'], {
          input: input.password + '\n',
        })
        if (result.exitCode !== 0 || !result.stdout.toString().trim())
          throw new Error(i18n('Unable to prepare transfer credentials.'))
        return result.stdout.toString().trim()
      },
    )
    await preparePrivateFiles()
    await remotes.merge(effects, {
      r2: {
        endpoint,
        access_key_id: input.accessKey,
        secret_access_key: input.secretKey,
      },
      nextcloud: { url: url.href, user: input.username, pass: obscured },
    })
    await configuration.merge(effects, {
      source_kind: 'r2',
      source,
      destination,
    })
    await sdk.action.clearTask(effects, 'atoll-recovery:configure')
    return {
      version: '1',
      title: i18n('Backup configuration saved'),
      message: i18n(
        'Start the service and check independent-copy freshness. Configuration alone does not verify a backup or restore.',
      ),
      result: null,
    }
  },
)
