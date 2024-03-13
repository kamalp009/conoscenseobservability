### Configure otel collector

#### Save collector config file

Save the following collector config in a file named `redis-collector-config.yaml`

```bash
receivers:
  redis:
    # The hostname and port of the Redis instance, separated by a colon.
    endpoint: "localhost:6379"
    # The frequency at which to collect metrics from the Redis instance.
    collection_interval: 60s
    # # The password used to access the Redis instance; must match the password specified in the requirepass server configuration option.
    # password: ${env:REDIS_PASSWORD}
    # # Defines the network to use for connecting to the server. Valid Values are `tcp` or `Unix`
    # transport: tcp
    # tls:
    #   insecure: false
    #   ca_file: /etc/ssl/certs/ca-certificates.crt
    #   cert_file: /etc/ssl/certs/redis.crt
    #   key_file: /etc/ssl/certs/redis.key
    metrics:
      redis.maxmemory:
        enabled: true
      redis.cmd.latency:
        enabled: true

processors:
  # enriches the data with additional host information
  # see https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor#resource-detection-processor
  resourcedetection/system:
    # add additional detectors if needed
    detectors: ["system"]
    system:
      hostname_sources: ["os"]

exporters:
  # export to local collector
  otlp/local:
    endpoint: "localhost:4317"
    tls:
      insecure: true
  # export to SigNoz cloud
  otlp/signoz:
    endpoint: "ingest.{region}.signoz.cloud:443"
    tls:
      insecure: false
    headers:
      "signoz-access-token": "<SIGNOZ_INGESTION_KEY>"

service:
  pipelines:
    metrics/redis:
      receivers: [redis]
      # note: remove this processor if the collector host is not running on the same host as the redis instance
      processors: [resourcedetection/system]
      exporters: [otlp/local]
```

#### Use collector config file

Run your collector with the added flag `--config redis-collector-config.yaml`
