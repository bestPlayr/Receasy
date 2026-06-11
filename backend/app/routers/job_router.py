import os
import uuid
import shutil
import smtplib
import secrets
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.dependencies import get_db, get_current_user_id
from app.config import settings

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

EDU_ORDER = ["High School", "Bachelor's", "Master's", "PhD"]
EXP_MINS = [0, 1, 3, 5, 7, 10]
MOCK_AI_SCORES = [96, 91, 88, 78, 72, 94, 87, 76, 93, 85, 97, 89, 74, 61]
INTERVIEW_PASS_THRESHOLD = 70


def send_email(to_email: str, subject: str, body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"Skipping actual email to {to_email} (SMTP credentials not configured).")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SENDER_EMAIL if hasattr(settings, 'SENDER_EMAIL') else settings.SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")


def check_auto_close(job, db: Session, bg_tasks: BackgroundTasks):
    if job.status == "open" and job.application_deadline:
        if datetime.now(timezone.utc) > job.application_deadline:
            job.status = "closed"
            db.commit()
            recruiter = db.query(models.User).filter(models.User.id == job.user_id).first()
            if recruiter:
                body = f"Hi {recruiter.full_name},\n\nThe deadline for '{job.position_name}' has passed. The job has been automatically closed to new applicants. You can now run AI Scoring."
                bg_tasks.add_task(send_email, recruiter.email, f"Job Closed Automatically: {job.position_name}", body)


def post_to_linkedin(text: str, token: str) -> str:
    if not token:
        print("[LinkedIn] No token provided.")
        return None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    try:
        user_res = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers)
        print(f"[LinkedIn] /userinfo status: {user_res.status_code} — {user_res.text}")
        user_res.raise_for_status()
        user_id = user_res.json()["sub"]
        print(f"[LinkedIn] Posting as user: {user_id}")

        payload = {
            "author": f"urn:li:person:{user_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {"com.linkedin.ugc.ShareContent": {"shareCommentary": {"text": text}, "shareMediaCategory": "NONE"}},
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
        }
        post_res = requests.post("https://api.linkedin.com/v2/ugcPosts", headers=headers, json=payload)
        print(f"[LinkedIn] /ugcPosts status: {post_res.status_code} — {post_res.text}")
        post_res.raise_for_status()
        urn = post_res.json().get("id")
        url = f"https://www.linkedin.com/feed/update/{urn}" if urn else None
        print(f"[LinkedIn] Post URL: {url}")
        return url
    except Exception as e:
        print(f"[LinkedIn] ERROR: {e}")
        return None


@router.get("/", response_model=List[schemas.JobOut])
def get_jobs(bg_tasks: BackgroundTasks, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    print(user_id)
    jobs = db.query(models.Job).filter(models.Job.user_id == user_id).order_by(models.Job.id.desc()).all()
    for job in jobs:
        check_auto_close(job, db, bg_tasks)
    return jobs

@router.post("/create", response_model=schemas.JobOut)
def create_job(job_data: schemas.JobCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):

    if "linkedin" in job_data.platforms:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user or not user.linkedin_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LinkedIn token not configured. Please add your LinkedIn token in Settings before posting to LinkedIn."
            )

    unique_public_id = str(uuid.uuid4())
    apply_link = f"http://localhost:5173/apply/{unique_public_id}"

    print(f"Application form: {apply_link}")

    new_job = models.Job(
        user_id=user_id,
        public_id=unique_public_id,
        application_form_url=apply_link,
        position_name=job_data.positionName,
        description=job_data.description,
        required_skills=job_data.requiredSkills,
        custom_questions=job_data.customQuestions,
        min_years_experience=job_data.minYearsExperience,
        salary_min=job_data.salaryMin,
        salary_max=job_data.salaryMax,
        work_type=job_data.workType,
        location=job_data.location,
        application_deadline=job_data.applicationDeadline,
        interview_deadline_days=job_data.interviewDeadlineDays,
        linkedin_url=None
    )
    db.add(new_job)
    db.flush()

    if "linkedin" in job_data.platforms:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        text = f"We are hiring a {job_data.positionName} in {job_data.location}!\n\n{job_data.description}\n\nApply now directly at: {apply_link}"
        new_job.linkedin_url = post_to_linkedin(text, user.linkedin_token)

    db.commit()
    db.refresh(new_job)
    return new_job

@router.get("/{public_id}/public", response_model=schemas.JobPublicOut)
def get_public_job(public_id: str, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Public endpoint for candidates to view job details without authentication."""
    job = db.query(models.Job).filter(models.Job.public_id == public_id).first()
    
    if not job: 
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        
    check_auto_close(job, db, bg_tasks)

    if job.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job is no longer accepting applications.")
        
    return job

@router.patch("/{job_id}/close")
def close_job(job_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == user_id).first()
    if not job: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status == "closed": raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job is already closed")

    job.status = "closed"
    db.commit()
    return {"status": "success"}

@router.post("/{public_id}/apply")
def apply_to_job(
    public_id: str, 
    bg_tasks: BackgroundTasks,
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    education_level: str = Form(...),
    years_of_experience: int = Form(...),
    salary_expectation: int = Form(...),
    salary_negotiable: bool = Form(...),
    comfortable_with_work_type: bool = Form(...),
    university: str = Form(None),
    github_link: str = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Check Job Status
    job = db.query(models.Job).filter(models.Job.public_id == public_id).first()
    if not job: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    
    check_auto_close(job, db, bg_tasks)
    if job.status == "closed": raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job is no longer accepting applications.")

    if db.query(models.Candidate).filter(models.Candidate.job_id == job.id, models.Candidate.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already applied.")

    # Save Resume Locally in Job-Specific Folder
    job_folder = os.path.join("uploads", "resumes", f"job_{job.id}")
    os.makedirs(job_folder, exist_ok=True)
    
    file_ext = resume.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(job_folder, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(resume.file, buffer)
    
    resume_url = f"http://localhost:8000/uploads/resumes/job_{job.id}/{unique_filename}"

    # Save Candidate to DB
    new_cand = models.Candidate(
        job_id=job.id,
        full_name=full_name,
        email=email,
        phone=phone,
        education_level=education_level,
        university=university,
        years_of_experience=years_of_experience,
        salary_expectation=salary_expectation,
        salary_negotiable=salary_negotiable,
        comfortable_with_work_type=comfortable_with_work_type,
        github_link=github_link,
        resume_link=resume_url
    )
    db.add(new_cand)
    db.commit()
    
    body = f"Hi {full_name},\n\nWe have successfully received your application for '{job.position_name}'. We will review your profile and get back to you shortly.\n\nBest,\nThe Hiring Team"
    bg_tasks.add_task(send_email, email, f"Application Received: {job.position_name}", body)
    
    return {"status": "success"}

@router.post("/{job_id}/score")
def score_candidates(job_id: int, filters: schemas.FilterPayload, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == user_id).first()
    if not job: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if job.status == "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Close the job before scoring candidates.")
    if not job.candidates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No candidates to score.")

    req_edu_idx = EDU_ORDER.index(filters.education) if filters.education != 'All' else 0
    exp_min = EXP_MINS[filters.expRange]

    score_idx = 0
    for c in job.candidates:
        cand_edu_idx = EDU_ORDER.index(c.education_level) if c.education_level in EDU_ORDER else 0
        if cand_edu_idx >= req_edu_idx and c.years_of_experience >= exp_min:
            if filters.salary == 'within' and c.salary_expectation > job.salary_max: continue
            if filters.salary == 'above' and c.salary_expectation <= job.salary_max: continue
            if filters.negotiable != 'All' and c.salary_negotiable != (filters.negotiable == 'Yes'): continue
            if filters.workTypeComfort != 'All' and c.comfortable_with_work_type != (filters.workTypeComfort == 'Yes'): continue
            
            c.ai_score = MOCK_AI_SCORES[score_idx % len(MOCK_AI_SCORES)]
            score_idx += 1
        else:
            c.ai_score = None

    job.ai_scoring_done = True
    db.commit()
    return {"status": "success"}

@router.post("/{job_id}/invite")
def send_invites(job_id: int, payload: schemas.InvitePayload, bg_tasks: BackgroundTasks, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == user_id).first()
    if not job: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if not job.ai_scoring_done:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI scoring must be completed before sending invites.")
    if job.invites_sent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invites have already been sent for this job.")

    scored = sorted([c for c in job.candidates if c.ai_score is not None], key=lambda x: x.ai_score, reverse=True)
    
    if not scored:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No eligible scored candidates found to invite.")

    invited_cands = scored[:payload.count]
    invited_ids = {c.id for c in invited_cands}
    
    for c in job.candidates:
        if c.id in invited_ids:
            c.interview_status = "invited"
            c.interview_token = secrets.token_urlsafe(32)
            c.interview_token_expires_at = datetime.now(timezone.utc) + timedelta(days=job.interview_deadline_days)
            
            interview_link = f"http://localhost:5173/interview/{c.interview_token}"
            body = f"Hi {c.full_name},\n\nYou have been shortlisted for {job.position_name}! Please complete your AI interview within {job.interview_deadline_days} days using this link:\n\n{interview_link}\n\nLink expires on: {c.interview_token_expires_at.strftime('%Y-%m-%d')}"
            bg_tasks.add_task(send_email, c.email, f"Interview Invitation: {job.position_name} at RecEasy", body)
        else:
            c.interview_status = "filtered_out"
            body = f"Hi {c.full_name},\n\nThank you for applying for {job.position_name}. Unfortunately, we will not be moving forward with your application at this time.\n\nBest wishes,\nHiring Team"
            bg_tasks.add_task(send_email, c.email, f"Application Update: {job.position_name}", body)

    job.invites_sent = True
    db.commit()
    return {"status": "success", "invited_count": len(invited_cands)}

@router.post("/{job_id}/candidates/{cand_id}/interview")
def complete_interview(job_id: int, cand_id: int, payload: schemas.InterviewScorePayload, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    cand = db.query(models.Candidate).filter(models.Candidate.id == cand_id, models.Candidate.job_id == job_id).first()
    if not cand: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if cand.interview_token_expires_at and datetime.now(timezone.utc) > cand.interview_token_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview link has expired.")

    cand.interview_given = True
    cand.interview_score = payload.score

    if payload.score >= INTERVIEW_PASS_THRESHOLD:
        body = f"Hi {cand.full_name},\n\nYou passed the technical interview for {cand.job.position_name}! We would like to invite you for an on-site interview. We will contact you soon with dates."
        bg_tasks.add_task(send_email, cand.email, "Next Steps: On-Site Interview", body)
    else:
        body = f"Hi {cand.full_name},\n\nThank you for completing the interview for {cand.job.position_name}. Unfortunately, we won't be moving forward with your profile."
        bg_tasks.add_task(send_email, cand.email, f"Application Update: {cand.job.position_name}", body)

    db.commit()
    return {"status": "success"}