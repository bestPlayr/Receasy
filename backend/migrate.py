"""
One-time migration script — run once after the schema changes:
  - candidates.ai_score: INTEGER → DOUBLE PRECISION (float)
  - candidates.ai_score_data: new JSONB column

Usage (from backend/ with venv active):
    python migrate.py
"""
from app.database import engine
from sqlalchemy import text

MIGRATIONS = [
    # Change ai_score from integer to float (DOUBLE PRECISION)
    "ALTER TABLE candidates ALTER COLUMN ai_score TYPE DOUBLE PRECISION USING ai_score::double precision",

    # Add ai_score_data JSONB column if it doesn't exist yet
    "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_score_data JSONB",

    # Add interview_feedback text column for AI interview evaluation
    "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_feedback TEXT",
]

def run():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            print(f"Running: {sql}")
            conn.execute(text(sql))
        conn.commit()
    print("\nMigration complete.")

if __name__ == "__main__":
    run()
