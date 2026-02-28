CREATE DATABASE IF NOT EXISTS reports;

CREATE TABLE IF NOT EXISTS reports.customers (
                                                 id UInt64,
                                                 external_id String,
                                                 first_name String,
                                                 email String
)
    ENGINE = ReplacingMergeTree()
    ORDER BY (id, external_id);

CREATE TABLE IF NOT EXISTS reports.telemetry (
                                                 customer_id UInt64,
                                                 signal_value Float64,
                                                 timestamp DateTime DEFAULT now()
    )
    ENGINE = MergeTree()
    ORDER BY (customer_id, timestamp);