from urllib.parse import urlparse

from app.config import settings


def frontend_base() -> str:
    return settings.FRONTEND_URL.rstrip("/")


def backend_base() -> str:
    return settings.BACKEND_URL.rstrip("/")


def apply_form_url(public_id: str) -> str:
    return f"{frontend_base()}/apply/{public_id}"


def interview_url(token: str) -> str:
    return f"{frontend_base()}/interview/{token}"


def stored_path(stored: str) -> str:
    if stored.startswith("http"):
        return urlparse(stored).path.lstrip("/")
    return stored.lstrip("/")


def resume_public_url(stored: str) -> str:
    return f"{backend_base()}/{stored_path(stored)}"


def sync_job_urls(job) -> bool:
    """Refresh stored job/candidate URLs from current env settings. Returns True if changed."""
    changed = False
    if job.public_id:
        correct_apply = apply_form_url(job.public_id)
        if job.application_form_url != correct_apply:
            job.application_form_url = correct_apply
            changed = True
    for candidate in job.candidates:
        if candidate.resume_link:
            correct_resume = resume_public_url(candidate.resume_link)
            if candidate.resume_link != correct_resume:
                candidate.resume_link = correct_resume
                changed = True
    return changed
