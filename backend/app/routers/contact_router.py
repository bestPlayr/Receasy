from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.dependencies import get_db

router = APIRouter(prefix="/api/contact", tags=["Contact"])

@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_contact_form(contact_data: schemas.ContactCreate, db: Session = Depends(get_db)):
    new_message = models.ContactMessage(
        first_name=contact_data.firstName,
        last_name=contact_data.lastName,
        email=contact_data.email,
        company=contact_data.company,
        subject=contact_data.subject,
        message=contact_data.message
    )
    db.add(new_message)
    db.commit()
    
    return {"message": "Your message has been received successfully."}