CREATE TABLE IF NOT EXISTS customers
(
    id          SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    first_name  TEXT,
    email       TEXT
);

CREATE TABLE IF NOT EXISTS telemetry
(
    id           SERIAL PRIMARY KEY,
    customer_id  INTEGER REFERENCES customers (id),
    signal_value FLOAT,
    timestamp    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);