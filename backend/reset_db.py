from app.database import engine, Base
from app.models import User, Job, Candidate, ContactMessage

print("Dropping all tables from database...")
Base.metadata.drop_all(bind=engine)

print("Recreating all tables with fresh schema...")
Base.metadata.create_all(bind=engine)
