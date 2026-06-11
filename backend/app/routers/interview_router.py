import json
import re
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.dependencies import get_db
from app.config import settings

router = APIRouter(prefix="/api/interview", tags=["Interview"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
TOTAL_QUESTIONS = 10


def call_groq(messages: list, temperature: float = 0.7) -> str:
    """Call Groq chat completions API and return the assistant message content."""
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="GROQ_API_KEY not configured.")
    res = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.MODEL_NAME,
            "messages": messages,
            "temperature": temperature,
        },
        timeout=60,
    )
    if not res.ok:
        print(f"[Groq] Error {res.status_code}: {res.text}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service is currently unavailable. Please try again.")
    return res.json()["choices"][0]["message"]["content"]


def extract_json(text: str):
    """Extract first JSON object/array from an LLM response (handles ```json fences)."""
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1)
    start_obj = text.find("{")
    start_arr = text.find("[")
    starts = [s for s in (start_obj, start_arr) if s != -1]
    if not starts:
        raise ValueError("No JSON found in LLM response")
    start = min(starts)
    open_ch = text[start]
    close_ch = "}" if open_ch == "{" else "]"
    depth = 0
    for i in range(start, len(text)):
        if text[i] == open_ch:
            depth += 1
        elif text[i] == close_ch:
            depth -= 1
            if depth == 0:
                return json.loads(text[start:i + 1])
    raise ValueError("Unbalanced JSON in LLM response")


def get_valid_candidate(token: str, db: Session) -> models.Candidate:
    cand = db.query(models.Candidate).filter(models.Candidate.interview_token == token).first()
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid interview link.")
    if cand.interview_given:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already completed this interview.")
    if cand.interview_token_expires_at and datetime.now(timezone.utc) > cand.interview_token_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This interview link has expired.")
    return cand


@router.get("/{token}", response_model=schemas.InterviewInfoOut)
def get_interview_info(token: str, db: Session = Depends(get_db)):
    cand = get_valid_candidate(token, db)
    job = cand.job
    owner = job.owner
    return {
        "candidateName": cand.full_name,
        "positionName": job.position_name,
        "companyName": owner.company_name if owner else None,
        "totalQuestions": TOTAL_QUESTIONS,
        "expiresAt": cand.interview_token_expires_at,
    }


@router.post("/{token}/questions", response_model=schemas.InterviewQuestionsOut)
def generate_questions(token: str, db: Session = Depends(get_db)):
    cand = get_valid_candidate(token, db)
    job = cand.job

    custom = [q.strip() for q in (job.custom_questions or []) if q and q.strip()][:TOTAL_QUESTIONS]
    remaining = TOTAL_QUESTIONS - len(custom)

    generated = []
    if remaining > 0:
        skills = ", ".join(job.required_skills or [])
        prompt = (
            f"You are a technical interviewer for the position of '{job.position_name}'.\n"
            f"Required skills: {skills}\n"
            f"Job description: {job.description}\n\n"
            f"Generate exactly {remaining} concise spoken-interview questions that assess the candidate "
            f"on the required skills. Questions must be answerable verbally in 1-2 minutes each — "
            f"no coding exercises, no whiteboard tasks. Mix conceptual, practical and experience-based questions. "
            f"Keep each question under 35 words.\n\n"
            f'Respond with ONLY a JSON array of {remaining} strings, e.g. ["Question 1?", "Question 2?"]'
        )
        content = call_groq([{"role": "user", "content": prompt}], temperature=0.8)
        try:
            arr = extract_json(content)
            generated = [str(q).strip() for q in arr if str(q).strip()][:remaining]
        except Exception as e:
            print(f"[Interview] Failed to parse generated questions: {e}\nRaw: {content}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to generate interview questions. Please try again.")

        # Top up with generic skill questions if the LLM returned fewer than requested
        skill_list = job.required_skills or ["your field"]
        i = 0
        while len(generated) < remaining:
            generated.append(f"Tell me about your hands-on experience with {skill_list[i % len(skill_list)]}.")
            i += 1

    return {"questions": custom + generated}


@router.post("/{token}/submit", response_model=schemas.InterviewResultOut)
def submit_interview(token: str, payload: schemas.InterviewSubmitPayload, db: Session = Depends(get_db)):
    cand = get_valid_candidate(token, db)
    job = cand.job

    if not payload.answers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No answers submitted.")

    transcript = "\n\n".join(
        f"Q{i+1}: {a.question}\nA{i+1}: {a.answer.strip() or '(no answer given)'}"
        for i, a in enumerate(payload.answers)
    )
    skills = ", ".join(job.required_skills or [])

    prompt = (
        f"You are an expert technical interviewer evaluating a voice interview for the position "
        f"of '{job.position_name}' (required skills: {skills}).\n\n"
        f"Interview transcript:\n{transcript}\n\n"
        "Evaluate the candidate's answers. Unanswered questions should significantly lower the score. "
        "Judge correctness, depth, relevance and communication. Be fair but rigorous.\n\n"
        "Respond with ONLY a JSON object in this exact format:\n"
        '{"score": <integer 0-100>, "feedback": "<4-8 sentences: strengths of the candidate, '
        'where the candidate lacked, and overall hiring impression>"}'
    )
    content = call_groq([{"role": "user", "content": prompt}], temperature=0.3)
    try:
        result = extract_json(content)
        score = int(max(0, min(100, result["score"])))
        feedback = str(result["feedback"]).strip()
    except Exception as e:
        print(f"[Interview] Failed to parse evaluation: {e}\nRaw: {content}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to evaluate interview. Please try again.")

    cand.interview_given = True
    cand.interview_score = score
    cand.interview_feedback = feedback
    db.commit()

    return {"status": "success"}
