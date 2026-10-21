FROM python:3.13.16-alpine3.24@sha256:2d9aefe2fef018a7eb2c13064c89c71929800fd2e5dccdbf52ea5da5bb8d929a
ARG TARGETARCH
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
COPY upstream/tools/backup-copy/copy.py upstream/tools/backup-copy/alerts.py /opt/cashu-copy/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /opt/cashu-copy
CMD ["python", "copy.py", "--config", "/data/private/copy.json", "--state", "/data/state/copy.json"]
