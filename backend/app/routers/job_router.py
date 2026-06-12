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
from app.score_resume import ResumeRanker
from app.urls import apply_form_url, interview_url, resume_public_url, stored_path, sync_job_urls

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

EDU_ORDER = ["High School", "Bachelor's", "Master's", "PhD"]


EXP_MINS = [0, 1, 3, 5, 7, 10]
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


def build_rejection_email(candidate_name: str, position_name: str) -> str:
    first = candidate_name.split()[0] if candidate_name else candidate_name
    return (
        f"Hi {first},\n\n"
        f"Thank you so much for taking the time to apply for the {position_name} position and for your interest in joining our team.\n\n"
        f"We were genuinely impressed by your background and the skills you bring to the table. After careful consideration, however, we were unable to move forward with your application at this stage — the process was highly competitive, and our decision ultimately came down to a very specific set of requirements for this particular role.\n\n"
        f"This does not reflect a lack of talent or capability on your part. We hold your profile in high regard and would truly love to keep you in mind for future opportunities that align with your experience.\n\n"
        f"We encourage you to keep an eye on our open roles and reapply when a suitable position becomes available. We genuinely hope our paths will cross again.\n\n"
        f"We wish you every success in your job search and your career ahead.\n\n"
        f"Warm regards,\n"
        f"The Hiring Team"
    )


def build_invite_email(candidate_name: str, position_name: str, interview_link: str, deadline_days: int, expires_date: str) -> str:
    first = candidate_name.split()[0] if candidate_name else candidate_name
    return (
        f"Hi {first},\n\n"
        f"Congratulations! 🎉\n\n"
        f"We are thrilled to inform you that you have been shortlisted for the {position_name} role, and we would like to invite you to complete an AI-powered interview as the next step in our hiring process.\n\n"
        f"Your AI Interview link is ready:\n"
        f"{interview_link}\n\n"
        f"Please complete the interview within {deadline_days} day{'s' if deadline_days != 1 else ''}. "
        f"The link will expire on {expires_date}.\n\n"
        f"A few things to keep in mind:\n"
        f"  • Find a quiet place with a stable internet connection.\n"
        f"  • Use Google Chrome or Microsoft Edge for the best experience.\n"
        f"  • Speak clearly and take your time to answer each question thoughtfully.\n\n"
        f"Should you have any questions or need assistance at any point, please don't hesitate to reach out to us — we're happy to help and want to make sure you have the best experience possible.\n\n"
        f"We look forward to hearing from you and wish you the very best of luck!\n\n"
        f"Best regards,\n"
        f"The Hiring Team"
    )


def check_auto_close(job, db: Session, bg_tasks: BackgroundTasks):
    if job.status == "open" and job.application_deadline:
        if datetime.now(timezone.utc) > job.application_deadline:
            job.status = "closed"
            db.commit()
            recruiter = db.query(models.User).filter(models.User.id == job.user_id).first()
            if recruiter:
                body = f"Hi {recruiter.full_name},\n\nThe deadline for '{job.position_name}' has passed. The job has been automatically closed to new applicants. You can now run AI Scoring."
                bg_tasks.add_task(send_email, recruiter.email, f"Job Closed Automatically: {job.position_name}", body)


def post_to_linkedin(text: str, token: str) -> tuple:
    """Returns (post_url, error_message). post_url is None on failure."""
    if not token:
        return None, "LinkedIn token not configured."
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    try:
        user_res = requests.get("https://api.linkedin.com/v2/userinfo", headers=headers)
        print(f"[LinkedIn] /userinfo status: {user_res.status_code} — {user_res.text}")
        if not user_res.ok:
            detail = user_res.json().get("message") or user_res.json().get("error_description") or user_res.text
            return None, f"LinkedIn auth failed ({user_res.status_code}): {detail}"
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
        if not post_res.ok:
            detail = post_res.json().get("message") or post_res.json().get("error_description") or post_res.text
            return None, f"LinkedIn post failed ({post_res.status_code}): {detail}"
        urn = post_res.json().get("id")
        url = f"https://www.linkedin.com/feed/update/{urn}" if urn else None
        print(f"[LinkedIn] Post URL: {url}")
        return url, None
    except Exception as e:
        print(f"[LinkedIn] ERROR: {e}")
        return None, str(e)


@router.get("/", response_model=List[schemas.JobOut])
def get_jobs(bg_tasks: BackgroundTasks, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    print(user_id)
    jobs = db.query(models.Job).filter(models.Job.user_id == user_id).order_by(models.Job.id.desc()).all()
    urls_changed = False
    for job in jobs:
        check_auto_close(job, db, bg_tasks)
        if sync_job_urls(job):
            urls_changed = True
    if urls_changed:
        db.commit()
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
    apply_link = apply_form_url(unique_public_id)

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

    linkedin_warning = None
    if "linkedin" in job_data.platforms:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        text = f"We are hiring a {job_data.positionName} in {job_data.location}!\n\n{job_data.description}\n\nApply now directly at: {apply_link}"
        linkedin_url, linkedin_error = post_to_linkedin(text, user.linkedin_token)
        new_job.linkedin_url = linkedin_url
        if linkedin_error:
            linkedin_warning = f"Job created, but LinkedIn posting failed: {linkedin_error}"
            print(f"[LinkedIn] Warning stored: {linkedin_warning}")

    db.commit()
    db.refresh(new_job)

    # Attach transient warning so the response schema can surface it
    if linkedin_warning:
        new_job.linkedinWarning = linkedin_warning

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


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == user_id).first()
    if not job: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    db.query(models.Candidate).filter(models.Candidate.job_id == job_id).delete(synchronize_session=False)
    db.delete(job)
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
    
    resume_rel = f"uploads/resumes/job_{job.id}/{unique_filename}"
    resume_url = resume_public_url(resume_rel)

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

    # Load the AI ranker once — model is cached after first load
    try:
        ranker = ResumeRanker()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to initialise AI scorer: {str(e)}")

    for c in job.candidates:
        cand_edu_idx = EDU_ORDER.index(c.education_level) if c.education_level in EDU_ORDER else 0
        if cand_edu_idx >= req_edu_idx and c.years_of_experience >= exp_min:
            if filters.salary == 'within' and c.salary_expectation > job.salary_max: continue
            if filters.salary == 'above' and c.salary_expectation <= job.salary_max: continue
            if filters.negotiable != 'All' and c.salary_negotiable != (filters.negotiable == 'Yes'): continue
            if filters.workTypeComfort != 'All' and c.comfortable_with_work_type != (filters.workTypeComfort == 'Yes'): continue

            # Convert stored URL to a local file path relative to the backend directory
            resume_path = stored_path(c.resume_link)
            try:
                result = ranker.score(resume_path=resume_path, jd_text=job.description)
                c.ai_score = float(result["final_score"])
                bd = result["score_breakdown"]
                c.ai_score_data = {
                    "category": result["category"],
                    "breakdown": [
                        {"key": "skill_match",       "label": "Skill Match",           "points": bd["skill_match     (30%)"], "max": 30,  "penalty": False},
                        {"key": "experience",        "label": "Experience",             "points": bd["experience      (22%)"], "max": 22,  "penalty": False},
                        {"key": "semantic_overall",  "label": "Semantic (Overall)",     "points": bd["semantic_overall(16%)"], "max": 16,  "penalty": False},
                        {"key": "semantic_weighted", "label": "Semantic (Weighted)",    "points": bd["semantic_weighted(10%)"], "max": 10, "penalty": False},
                        {"key": "education",         "label": "Education",              "points": bd["education        (6%)"], "max": 6,   "penalty": False},
                        {"key": "certifications",    "label": "Certifications",         "points": bd["certifications   (4%)"], "max": 4,   "penalty": False},
                        {"key": "skill_count",       "label": "Skill Count",            "points": bd["skill_count      (4%)"], "max": 4,   "penalty": False},
                        {"key": "skills_breadth",    "label": "Skills Breadth",         "points": bd["skills_breadth   (4%)"], "max": 4,   "penalty": False},
                        {"key": "jd_coverage",       "label": "JD Coverage",            "points": bd["jd_coverage      (4%)"], "max": 4,   "penalty": False},
                        {"key": "missing_penalty",   "label": "Missing Skill Penalty",  "points": bd["missing_penalty(-12%)"], "max": 12,  "penalty": True},
                    ],
                    "skill_match_pct":     result["skill_match_pct"],
                    "matched_skills":      result["matched_skills"],
                    "missing_skills":      result["missing_skills"],
                    "semantic_similarity": result["semantic_similarity"],
                    "experience_years":    result["experience_years"],
                    "education_level":     result["education_level"],
                    "certifications":      result.get("certifications", []),
                }
            except Exception as e:
                print(f"[AI Scoring] Error scoring candidate {c.id}: {e}")
                c.ai_score = None
                c.ai_score_data = None
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
            interview_link = interview_url(c.interview_token)
            expires_date = c.interview_token_expires_at.strftime('%B %d, %Y')
            body = build_invite_email(c.full_name, job.position_name, interview_link, job.interview_deadline_days, expires_date)
            bg_tasks.add_task(send_email, c.email, f"Congratulations! Interview Invitation — {job.position_name}", body)
        else:
            c.interview_status = "filtered_out"
            body = build_rejection_email(c.full_name, job.position_name)
            bg_tasks.add_task(send_email, c.email, f"Your Application for {job.position_name}", body)

    job.invites_sent = True
    db.commit()
    return {"status": "success", "invited_count": len(invited_cands)}


@router.post("/{job_id}/candidates/{cand_id}/invite")
def invite_single_candidate(job_id: int, cand_id: int, bg_tasks: BackgroundTasks, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    job = db.query(models.Job).filter(models.Job.id == job_id, models.Job.user_id == user_id).first()
    if not job: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if not job.ai_scoring_done:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI scoring must be completed before sending invites.")

    cand = db.query(models.Candidate).filter(models.Candidate.id == cand_id, models.Candidate.job_id == job_id).first()
    if not cand: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if cand.interview_status == "invited":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate has already been invited.")

    cand.interview_status = "invited"
    cand.interview_token = secrets.token_urlsafe(32)
    cand.interview_token_expires_at = datetime.now(timezone.utc) + timedelta(days=job.interview_deadline_days)
    interview_link = interview_url(cand.interview_token)
    expires_date = cand.interview_token_expires_at.strftime('%B %d, %Y')
    body = build_invite_email(cand.full_name, job.position_name, interview_link, job.interview_deadline_days, expires_date)
    bg_tasks.add_task(send_email, cand.email, f"Congratulations! Interview Invitation — {job.position_name}", body)

    db.commit()
    return {"status": "success"}

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