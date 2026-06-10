from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/linkedin", response_model=schemas.LinkedInTokenStatus)
def get_linkedin_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"configured": bool(user.linkedin_token)}


@router.post("/linkedin", response_model=schemas.LinkedInTokenStatus)
def save_linkedin_token(
    payload: schemas.LinkedInTokenUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.linkedin_token = payload.token.strip() or None
    db.commit()
    return {"configured": bool(user.linkedin_token)}


@router.delete("/linkedin", response_model=schemas.LinkedInTokenStatus)
def remove_linkedin_token(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.linkedin_token = None
    db.commit()
    return {"configured": False}
