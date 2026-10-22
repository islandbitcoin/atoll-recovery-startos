FROM python:3.13.16-alpine3.24@sha256:2d9aefe2fef018a7eb2c13064c89c71929800fd2e5dccdbf52ea5da5bb8d929a
ARG TARGETARCH
# The base is digest-pinned, so its CA packages are frozen at 20260909-r0, which
# still trusts the compromised eMudhra intermediates (emSign ECC Root CA - G3).
# Upgrade BOTH ca-certificates packages: upgrading only -bundle regenerates the
# store from the stale source dir and the emSign root comes back. Assert the
# root is gone. Temporary: drop this layer once the pinned digest is bumped to
# one built on Alpine >= 20261020-r0.
RUN apk upgrade --no-cache ca-certificates ca-certificates-bundle \
 && if [ -f /etc/ssl/certs/ca-certificates.crt.apk-new ]; then mv /etc/ssl/certs/ca-certificates.crt.apk-new /etc/ssl/certs/ca-certificates.crt; fi \
 && ! grep -q MIICTjCCAdOgAwIBAgIKPPYHqWhwDtqLhDAKBggqhkjOPQQDAzBr /etc/ssl/certs/ca-certificates.crt
RUN TARGETARCH="$TARGETARCH" python - <<'PY'
import hashlib, io, os, urllib.request, zipfile
arch = os.environ['TARGETARCH']
pins = {
    'amd64': '349ac8fba6ff65d6247043f1750cdcb518ec5d500ef91463a10d37c0ccdf3702',
    'arm64': '7e1e8d69654941b7b7df84ee74c5f7fb09cce7d5496947fb7bf16b55ff427d10',
}
url = f'https://github.com/rclone/rclone/releases/download/v1.75.2/rclone-v1.75.2-linux-{arch}.zip'
with urllib.request.urlopen(url, timeout=60) as response:
    archive = response.read()
assert hashlib.sha256(archive).hexdigest() == pins[arch], 'rclone checksum mismatch'
with zipfile.ZipFile(io.BytesIO(archive)) as z:
    binary = z.read(f'rclone-v1.75.2-linux-{arch}/rclone')
with open('/usr/local/bin/rclone', 'wb') as out:
    out.write(binary)
os.chmod('/usr/local/bin/rclone', 0o755)
PY
COPY upstream/tools/backup-copy/copy.py upstream/tools/backup-copy/alerts.py upstream/tools/backup-copy/issuer_source.py upstream/tools/backup-copy/connect.py /opt/cashu-copy/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /opt/cashu-copy
CMD ["python", "copy.py", "--config", "/data/private/copy.json", "--state", "/data/state/copy.json"]
