FROM alpine:3.20

RUN apk add --no-cache \
      pgbackrest \
      postgresql-client \
      bash \
      curl \
      jq \
      tzdata \
      ca-certificates \
      coreutils \
  && curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
  && chmod +x /usr/local/bin/mc

WORKDIR /opt/backup

COPY entrypoint.sh /opt/backup/entrypoint.sh
COPY run-backup.sh /opt/backup/run-backup.sh

RUN chmod +x /opt/backup/*.sh

ENV TZ=Asia/Tehran

ENTRYPOINT ["/opt/backup/entrypoint.sh"]
