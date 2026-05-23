from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.database import SessionLocal
from app import models
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/signin", auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_id(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if settings.DEBUG and not token:
        # BYPASS AUTH IN DEBUG MODE: Return user ID 1 (creates dummy if doesn't exist)
        user = db.query(models.User).first()
        if not user:
            user = models.User(full_name="Debug Admin", email="debug@receasy.com", hashed_password="test")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user.id

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user.id