import { i18n } from './i18n'

export function primaryLabel(origin?: string) {
  if (origin) {
    try {
      return new URL(origin).hostname
    } catch {
      // Legacy manual connections may have no usable issuer origin.
    }
  }
  return i18n('Primary connection')
}

// Use the same clock sample for the upstream age and the snapshot timestamp.
// Return only the public health fields, including when a copy cycle fails.
export function freshnessCommand(statePath: string): [string, ...string[]] {
  return [
    'python',
    '-c',
    [
      'import json, runpy, sys, time',
      'from pathlib import Path',
      "sys.path.insert(0, '/opt/cashu-copy')",
      "health = runpy.run_path('/opt/cashu-copy/copy.py')['health']",
      'now = time.time()',
      'report = health(Path(sys.argv[1]), now)',
      "age = report['source_age_seconds']",
      "report['source_time'] = now - age if age is not None else None",
      'print(json.dumps(report))',
    ].join('\n'),
    statePath,
  ]
}

export function snapshotTime(seconds: unknown) {
  if (typeof seconds !== 'number') return null
  const date = new Date(seconds * 1000)
  return Number.isFinite(date.getTime())
    ? date.toISOString().replace('.000Z', 'Z')
    : null
}
