#!/usr/bin/env bash
set -euo pipefail

CRON_SCHEDULE="${BACKUP_CRON:-0 2 * * *}"

mkdir -p /var/log
touch /var/log/pgbackrest-backup.log

echo "${CRON_SCHEDULE} /opt/backup/run-backup.sh >> /var/log/pgbackrest-backup.log 2>&1" > /etc/crontabs/root

exec crond -f -l 8 -L /var/log/pgbackrest-cron.log
