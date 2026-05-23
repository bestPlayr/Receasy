from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    jobs = relationship("Job", back_populates="owner")

class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    company = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    position_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(ARRAY(String), nullable=False)
    custom_questions = Column(ARRAY(String), nullable=True)
    min_years_experience = Column(Integer, nullable=False)
    salary_min = Column(Integer, nullable=False)
    salary_max = Column(Integer, nullable=False)
    work_type = Column(String, nullable=False)
    location = Column(String, nullable=False)
    linkedin_url = Column(String, nullable=True)
    status = Column(String, default="open")
    ai_scoring_done = Column(Boolean, default=False)
    invites_sent = Column(Boolean, default=False)
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="jobs")
    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    education_level = Column(String, nullable=False)
    university = Column(String, nullable=True)
    years_of_experience = Column(Integer, nullable=False)
    salary_expectation = Column(Integer, nullable=False)
    salary_negotiable = Column(Boolean, nullable=False)
    comfortable_with_work_type = Column(Boolean, nullable=False)
    github_link = Column(String, nullable=True)
    resume_link = Column(String, nullable=False)
    ai_score = Column(Integer, nullable=True)
    interview_status = Column(String, nullable=True)
    interview_given = Column(Boolean, default=False)
    interview_score = Column(Integer, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    job = relationship("Job", back_populates="candidates")