from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from clickhouse_driver import Client
from datetime import datetime, timedelta
import redis as redis_lib
import time

def run_etl():
    pg_hook = PostgresHook(postgres_conn_id='postgres_source')

    customers_data = pg_hook.get_records("SELECT id, external_id, first_name, email FROM customers")
    telemetry_data = pg_hook.get_records("SELECT customer_id, signal_value, timestamp FROM telemetry")

    ch_client = Client(
        host='bionicpro-clickhouse',
        port=9000,
        user='reports_user',
        password='reports_password',
        database='reports'
    )

    if customers_data:
        ch_client.execute(
            'INSERT INTO reports.customers (id, external_id, first_name, email) VALUES',
            customers_data
        )

    if telemetry_data:
        ch_client.execute(
            'INSERT INTO reports.telemetry (customer_id, signal_value, timestamp) VALUES',
            telemetry_data
        )


def invalidate_report_cache():
    r = redis_lib.Redis(host='redis', port=6379)
    r.set('etl:last_run', int(time.time() * 1000))


default_args = {
    'owner': 'airflow',
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
        'bionicpro_postgres_to_clickhouse',
        default_args=default_args,
        description='ETL: Postgres CRM/Telemetry to ClickHouse OLAP',
        schedule_interval='@hourly',
        start_date=datetime(2024, 1, 1),
        catchup=False,
        tags=['bionicpro'],
) as dag:

    etl_task = PythonOperator(
        task_id='transfer_data',
        python_callable=run_etl
    )

    invalidate_task = PythonOperator(
        task_id='invalidate_cache',
        python_callable=invalidate_report_cache
    )

    etl_task >> invalidate_task
