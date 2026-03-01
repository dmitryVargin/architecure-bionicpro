CREATE DATABASE IF NOT EXISTS reports;

-- Unused. Legacy table populated by Airflow ETL (task 2). Replaced by customers_cdc via CDC pipeline.
CREATE TABLE IF NOT EXISTS reports.customers (
                                                 id UInt64,
                                                 external_id String,
                                                 first_name String,
                                                 email String
)
    ENGINE = ReplacingMergeTree()
    ORDER BY (id, external_id);

-- Unused. Legacy table populated by Airflow ETL (task 2). Replaced by telemetry_cdc via CDC pipeline.
CREATE TABLE IF NOT EXISTS reports.telemetry (
                                                 customer_id UInt64,
                                                 signal_value Float64,
                                                 timestamp DateTime DEFAULT now()
    )
    ENGINE = MergeTree()
    ORDER BY (customer_id, timestamp);

CREATE TABLE IF NOT EXISTS reports.customers_cdc (
    id UInt64,
    external_id String,
    first_name String,
    email String
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS reports.telemetry_cdc (
    id UInt64,
    customer_id UInt64,
    signal_value Float64,
    timestamp DateTime
) ENGINE = ReplacingMergeTree() ORDER BY id;

CREATE TABLE IF NOT EXISTS reports.kafka_customers (
    id UInt64,
    external_id String,
    first_name String,
    email String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'bionicpro.public.customers',
    kafka_group_name = 'ch_customers_group',
    kafka_format = 'JSONEachRow',
    kafka_skip_broken_messages = 10;

CREATE TABLE IF NOT EXISTS reports.kafka_telemetry (
    id UInt64,
    customer_id UInt64,
    signal_value Float64,
    timestamp Int64
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'bionicpro.public.telemetry',
    kafka_group_name = 'ch_telemetry_group',
    kafka_format = 'JSONEachRow',
    kafka_skip_broken_messages = 10;

CREATE MATERIALIZED VIEW IF NOT EXISTS reports.mv_customers TO reports.customers_cdc AS
SELECT id, external_id, first_name, email
FROM reports.kafka_customers;

CREATE MATERIALIZED VIEW IF NOT EXISTS reports.mv_telemetry TO reports.telemetry_cdc AS
SELECT id, customer_id, signal_value, toDateTime(intDiv(timestamp, 1000000)) AS timestamp
FROM reports.kafka_telemetry;

CREATE VIEW IF NOT EXISTS reports.report_vitrina AS
SELECT
    c.external_id,
    c.first_name,
    c.email,
    count(t.signal_value)   AS total_measurements,
    avg(t.signal_value)     AS avg_signal,
    min(t.signal_value)     AS min_signal,
    max(t.signal_value)     AS max_signal,
    min(t.timestamp)        AS first_record,
    max(t.timestamp)        AS last_record
FROM (SELECT * FROM reports.customers_cdc FINAL) AS c
JOIN reports.telemetry_cdc AS t ON t.customer_id = c.id
GROUP BY c.external_id, c.first_name, c.email;