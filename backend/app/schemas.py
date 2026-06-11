from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, example="Jane Smith")
    email: EmailStr
    company: Optional[str] = None
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user_name: str

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    company_name: Optional[str]

    class Config:
        from_attributes = True

# --- Contact Schemas ---
class ContactCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    company: Optional[str] = None
    subject: str
    message: str

# --- Candidate Schemas ---
class CandidateCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    education_level: str
    university: Optional[str]
    years_of_experience: int
    salary_expectation: int
    salary_negotiable: bool
    comfortable_with_work_type: bool
    github_link: Optional[str]
    resume_link: str

class CandidateOut(CandidateCreate):
    id: int
    job_id: int
    ai_score: Optional[int]
    interview_status: Optional[str]
    interview_given: bool
    interview_score: Optional[int]
    applied_at: datetime
    class Config:
        from_attributes = True

# --- Job Schemas ---

class JobCreate(BaseModel):
    positionName: str
    description: str
    requiredSkills: List[str]
    customQuestions: Optional[List[str]] = []
    minYearsExperience: int
    salaryMin: int
    salaryMax: int
    workType: str
    location: str
    platforms: List[str]
    applicationDeadline: Optional[datetime] = None
    interviewDeadlineDays: int = 7

class JobOut(BaseModel):
    id: int
    positionName: str = Field(alias="position_name")
    description: str
    requiredSkills: List[str] = Field(alias="required_skills")
    customQuestions: Optional[List[str]] = Field(default=[], alias="custom_questions")
    minYearsExperience: int = Field(alias="min_years_experience")
    salaryMin: int = Field(alias="salary_min")
    salaryMax: int = Field(alias="salary_max")
    workType: str = Field(alias="work_type")
    location: str
    linkedin_url: Optional[str]
    status: str
    aiScoringDone: bool = Field(alias="ai_scoring_done")
    invitesSent: bool = Field(alias="invites_sent")
    postedAt: datetime = Field(alias="posted_at")
    candidates: List[CandidateOut] = []
    applicationDeadline: Optional[datetime] = Field(None, alias="application_deadline")
    interviewDeadlineDays: int = Field(7, alias="interview_deadline_days")
    class Config:
        from_attributes = True
        populate_by_name = True

class JobPublicOut(BaseModel):
    id: int
    positionName: str = Field(alias="position_name")
    description: str
    requiredSkills: List[str] = Field(alias="required_skills")
    customQuestions: Optional[List[str]] = Field(default=[], alias="custom_questions")
    minYearsExperience: int = Field(alias="min_years_experience")
    workType: str = Field(alias="work_type")
    location: str
    status: str
    postedAt: datetime = Field(alias="posted_at")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class FilterPayload(BaseModel):
    education: str
    expRange: int
    salary: str
    negotiable: str
    workTypeComfort: str

class InvitePayload(BaseModel):
    count: int

# --- Settings Schemas ---
class LinkedInTokenUpdate(BaseModel):
    token: str

class LinkedInTokenStatus(BaseModel):
    configured: bool

# --- Interview Schemas ---
class InterviewScorePayload(BaseModel):
    score: int