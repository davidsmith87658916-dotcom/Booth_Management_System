import hashlib
import hmac
import secrets
import os
from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, ConfigDict, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from database import get_db
import models

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

router = APIRouter(prefix='/api')
COOKIE = 'expohub_session'

def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600000).hex()
    return f'pbkdf2_sha256$600000${salt}${digest}'

def verify_password(password, value):
    try:
        _, rounds, salt, expected = value.split('$')
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, AttributeError):
        return False

def user_view(u):
    return {'id':u.id,'name':u.name,'email':u.email,'role':u.role,'phone':u.phone,'is_active':u.is_active,'can_login':bool(u.password_hash),'must_change_password':u.must_change_password}

def current_user(request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get(COOKIE, '')
    session = db.get(models.AuthSession, hashlib.sha256(raw.encode()).hexdigest()) if raw else None
    if not session or session.expires_at <= utc_now():
        raise HTTPException(401, 'Please sign in')
    user = db.get(models.User, session.user_id)
    if not user or not user.is_active or not user.password_hash:
        raise HTTPException(401, 'This account is disabled')
    if user.must_change_password and request.url.path not in ('/api/auth/me','/api/auth/password','/api/auth/logout'):
        raise HTTPException(403, 'Change your temporary password before continuing')
    return user

def require_admin(user=Depends(current_user)):
    if user.role != 'admin':
        raise HTTPException(403, 'Administrator access required')
    return user

def require_finance_or_admin(user=Depends(current_user)):
    if user.role not in ('admin', 'accountant'):
        raise HTTPException(403, 'Finance or Administrator access required')
    return user

def audit(db, user, action, target):
    db.add(models.AuditLog(user_id=user.id if user else None, action=action, target=str(target)))

def own_booking(user, booking):
    if user.role not in ('admin', 'accountant') and booking.staff_id != user.id:
        raise HTTPException(403, 'Only the seller or an administrator can change this booking')

class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    role: Literal['admin', 'staff', 'accountant'] = 'staff'
    phone: str | None = None
    @field_validator('name','email')
    @classmethod
    def trim(cls,value):
        value=value.strip()
        if not value: raise ValueError('This field is required')
        return value
    @field_validator('email')
    @classmethod
    def valid_email(cls,value):
        if '@' not in value or '.' not in value.split('@')[-1]: raise ValueError('Enter a valid email address')
        return value.lower()

class AccountUpdate(BaseModel):
    name: str = Field(min_length=1,max_length=100)
    role: Literal['admin', 'staff', 'accountant']
    is_active: bool

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1,max_length=128)
    new_password: str = Field(min_length=1,max_length=128)

class PasswordReset(BaseModel):
    password: str = Field(min_length=1,max_length=128)

def get_cookie_params():
    secure = os.getenv('COOKIE_SECURE') == '1'
    # Default to 'none' if COOKIE_SECURE is enabled (required for cross-site Vercel <-> Render),
    # otherwise default to 'lax' for local development without HTTPS.
    samesite = os.getenv('COOKIE_SAMESITE', 'none' if secure else 'lax').lower()
    return {'secure': secure, 'samesite': samesite}

def issue_session(db, user, response):
    raw = secrets.token_urlsafe(32)
    # Long-lived session: 90 days token validity
    db.add(models.AuthSession(token_hash=hashlib.sha256(raw.encode()).hexdigest(), user_id=user.id, expires_at=utc_now()+timedelta(days=90)))
    params = get_cookie_params()
    response.set_cookie(COOKIE, raw, httponly=True, secure=params['secure'], samesite=params['samesite'], max_age=7776000, path='/')

@router.get('/auth/status')
def auth_status(db: Session = Depends(get_db)):
    return {'needs_setup': not db.query(models.User).filter(models.User.password_hash.isnot(None)).first()}

@router.post('/auth/setup')
def setup(data: AccountCreate, request: Request, response: Response, db: Session = Depends(get_db)):
    client_host = request.client.host if request.client else '127.0.0.1'
    if os.getenv('ALLOW_REMOTE_SETUP') != '1' and (client_host not in ('127.0.0.1', 'localhost', '::1', 'testclient')):
        raise HTTPException(403, 'Initial setup is permitted only from localhost. Set ALLOW_REMOTE_SETUP=1 to allow remote setup.')
    if db.bind and db.bind.dialect.name == 'sqlite':
        db.execute(text('BEGIN IMMEDIATE'))
    if db.query(models.User).filter(models.User.password_hash.isnot(None)).first():
        raise HTTPException(409, 'Initial setup is already complete')
    user = db.query(models.User).filter(func.lower(models.User.email) == data.email).first()
    if user:
        user.name=data.name; user.role='admin'; user.is_active=True; user.password_hash=hash_password(data.password)
    else:
        user=models.User(name=data.name,email=data.email,password_hash=hash_password(data.password),role='admin',is_active=True)
        db.add(user); db.flush()
    issue_session(db,user,response); audit(db,user,'admin.setup',user.id); db.commit()
    return user_view(user)

@router.post('/auth/login')
def login(data: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    email_query = data.email.strip().lower()
    client_host = request.client.host if request.client else '127.0.0.1'

    key = hashlib.sha256((client_host + '|' + email_query).encode()).hexdigest()
    throttle = db.get(models.LoginThrottle, key)
    now = utc_now()
    if throttle and now - throttle.window_start < timedelta(minutes=15) and throttle.attempts >= 10:
        raise HTTPException(429, 'Too many attempts. Try again in 15 minutes.')
    user = db.query(models.User).filter(func.lower(models.User.email) == email_query).first()

    valid_password = False
    if user and user.is_active and user.password_hash:
        if verify_password(data.password, user.password_hash):
            valid_password = True

    if not user or not user.is_active or not valid_password:
        if not throttle:
            throttle = models.LoginThrottle(key=key, attempts=0, window_start=now)
            db.add(throttle)
        if now - throttle.window_start >= timedelta(minutes=15):
            throttle.attempts = 0
            throttle.window_start = now
        throttle.attempts += 1
        db.commit()
        raise HTTPException(401, 'Incorrect email or password')
    if throttle:
        db.delete(throttle)
    issue_session(db, user, response)
    audit(db, user, 'auth.login', user.id)
    db.commit()
    return user_view(user)

@router.get('/auth/me')
def me(user=Depends(current_user)):
    return user_view(user)

@router.post('/auth/logout')
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw=request.cookies.get(COOKIE,'')
    db.query(models.AuthSession).filter_by(token_hash=hashlib.sha256(raw.encode()).hexdigest()).delete()
    db.commit()
    params = get_cookie_params()
    response.delete_cookie(COOKIE, path='/', secure=params['secure'], samesite=params['samesite'])
    return {'message':'Signed out'}

@router.post('/auth/password')
def change_password(data: PasswordChange, response: Response, user=Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password,user.password_hash): raise HTTPException(400,'Current password is incorrect')
    user.password_hash=hash_password(data.new_password); user.must_change_password=False
    db.query(models.AuthSession).filter_by(user_id=user.id).delete()
    issue_session(db,user,response); audit(db,user,'password.changed',user.id); db.commit()
    return user_view(user)

@router.get('/users')
def users(user=Depends(require_admin), db: Session = Depends(get_db)):
    return [user_view(u) for u in db.query(models.User).order_by(models.User.id).all()]

@router.post('/users',status_code=201)
def create_user(data: AccountCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(models.User).filter(func.lower(models.User.email) == data.email).first(): raise HTTPException(409,'Email already exists')
    new=models.User(name=data.name,email=data.email,phone=data.phone,role=data.role,password_hash=hash_password(data.password),is_active=True,must_change_password=True)
    db.add(new); db.flush(); audit(db,user,'user.created',new.id); db.commit()
    return user_view(new)

@router.put('/users/{user_id}')
def update_user(user_id:int,data:AccountUpdate,user=Depends(require_admin),db: Session=Depends(get_db)):
    target=db.get(models.User,user_id)
    if not target: raise HTTPException(404,'User not found')
    if target.id == user.id and (not data.is_active or data.role != 'admin'): raise HTTPException(409,'You cannot deactivate or demote your own administrator account')
    target.name=data.name.strip(); target.role=data.role; target.is_active=data.is_active
    if not target.name: raise HTTPException(422,'Name is required')
    if target.id != user.id:
        db.query(models.AuthSession).filter_by(user_id=target.id).delete()
    audit(db,user,'user.updated',target.id); db.commit(); return user_view(target)

@router.post('/users/{user_id}/password')
def reset_password(user_id:int,data:PasswordReset,user=Depends(require_admin),db:Session=Depends(get_db)):
    target=db.get(models.User,user_id)
    if not target: raise HTTPException(404,'User not found')
    if target.id == user.id: raise HTTPException(400,'Use Change password for your own account')
    target.password_hash=hash_password(data.password); target.must_change_password=True
    db.query(models.AuthSession).filter_by(user_id=target.id).delete()
    audit(db,user,'user.password_reset',target.id); db.commit(); return {'message':'Temporary password set'}

@router.get('/audit')
def audit_history(user=Depends(require_admin),db:Session=Depends(get_db)):
    rows=db.query(models.AuditLog,models.User.name).outerjoin(models.User,models.User.id==models.AuditLog.user_id).order_by(models.AuditLog.id.desc()).limit(200).all()
    return [{'id':a.id,'actor':name or 'System','action':a.action,'target':a.target,'created_at':a.created_at.isoformat()+'Z'} for a,name in rows]
