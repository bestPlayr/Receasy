from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, auth
from app.dependencies import get_db
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_pw = auth.get_password_hash(user_data.password)
    new_user = models.User(
        full_name=user_data.name,
        email=user_data.email,
        company_name=user_data.company,
        hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate Token
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer", "user_name": new_user.full_name}

@router.post("/signin", response_model=schemas.Token)
def signin(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    # If "Remember Me", token life = 7 days
    expire_time = timedelta(days=7) if login_data.remember else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=expire_time
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user_name": user.full_name}