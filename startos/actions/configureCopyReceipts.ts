import { sdk } from '../sdk'
import { i18n } from '../i18n'
import { configuration } from '../fileModels/config'
import { preparePrivateFiles } from '../utils'

export const configureCopyReceipts = sdk.Action.withInput(
  'configure-copy-receipts',
  {
    name: i18n('Configure Copy Receipts'),
    description: i18n(
      'Report destination read-back to an issuer that separately authorized copy attestations.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  },
  sdk.InputSpec.of({
    enabled: sdk.Value.toggle({
      name: i18n('Enable verified-copy receipts'),
      default: false,
    }),
  }),
  async () => ({
    enabled: (await configuration.read().once())?.attest_copies ?? false,
  }),
  async ({ effects, input }) => {
    await preparePrivateFiles()
    const saved = await configuration.read().once()
    if (
      input.enabled &&
      (saved?.source_kind !== 'issuer' ||
        !saved.issuer_id ||
        !saved.issuer_secret ||
        !saved.issuer_origin)
    )
      throw new Error(
        i18n('Copy receipts require a paired issuer. Connect Issuer first.'),
      )
    await configuration.merge(effects, { attest_copies: input.enabled })
    return {
      version: '1',
      title: i18n('Configure Copy Receipts'),
      message: i18n(
        'Copy receipt settings saved. If enabled, the issuer must separately allow copy attestations. Start Atoll and verify issuer backup health.',
      ),
      result: null,
    }
  },
)
