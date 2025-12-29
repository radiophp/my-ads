#!/usr/bin/env sh
set -e

apk add --no-cache pgbackrest >/dev/null
mkdir -p /var/spool/pgbackrest
chown -R postgres:postgres /var/spool/pgbackrest
mkdir -p /var/run/postgresql
chown -R postgres:postgres /var/run/postgresql

exec /usr/local/bin/docker-entrypoint.sh "$@"
