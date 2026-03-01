from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from datetime import datetime
import csv

default_args = {
    'owner': 'airflow',
    'start_date': datetime(2024, 12, 1),
}

def generate_insert_queries():
    CSV_FILE_PATH = '/opt/airflow/sample_files/sample.csv'
    with open(CSV_FILE_PATH, 'r') as csvfile:
        csvreader = csv.reader(csvfile)

        insert_queries = []
        is_header = True
        for row in csvreader:
            if is_header:
                is_header = False
                continue
            insert_query = f"INSERT INTO sample_table (id,order_number,total,discount,buyer_id) VALUES ({row[0]}, {row[1]}, {row[2]},{row[3]},{row[4]});"
            insert_queries.append(insert_query)

        with open('/opt/airflow/dags/sql/insert_queries.sql', 'w') as f:
            for query in insert_queries:
                f.write(f"{query}\n")

with DAG('csv_to_postgres_dag',
         default_args=default_args,
         schedule_interval='@once',
         catchup=False) as dag:

    create_table = PostgresOperator(
        task_id='create_table',
        postgres_conn_id='write_to_postgres',
        sql="""
        DROP TABLE IF EXISTS sample_table;
        CREATE TABLE sample_table (
            id SERIAL PRIMARY KEY,
            order_number BIGINT,
            total NUMERIC(18,2),
            discount NUMERIC(18,2),
            buyer_id BIGINT
        );
        """
    )

    generate_queries = PythonOperator(
        task_id='generate_insert_queries',
        python_callable=generate_insert_queries
    )

    run_insert_queries = PostgresOperator(
        task_id='run_insert_queries',
        postgres_conn_id='write_to_postgres',
        sql='sql/insert_queries.sql'
    )

    create_table >> generate_queries >> run_insert_queries
