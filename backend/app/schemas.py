from pydantic import BaseModel, EmailStr, Field
from typing import Optional

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