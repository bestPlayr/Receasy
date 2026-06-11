from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    ))
    tables = [row[0] for row in result]

print("Tables in receasy_db:", tables)

if "candidates" in tables:
    with engine.connect() as conn:
        cols = conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='candidates' ORDER BY ordinal_position"
        ))
        print("\ncandidates columns:")
        for col in cols:
            print(f"  {col[0]:30s} {col[1]}")
else:
    print("\n'candidates' table does NOT exist.")
