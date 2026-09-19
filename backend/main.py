from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
from auth import current_user, require_admin, own_booking, audit, require_finance_or_admin, require_manager_or_admin
from auth import router as auth_router
from layout import router as layout_router
from migrations import migrate
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from decimal import Decimal
from pathlib import Path
from pydantic import BaseModel, Field

from database import engine, get_db, Base
import models
import schemas

@asynccontextmanager
async def lifespan(app):
    migrate()
    yield

app = FastAPI(
    lifespan=lifespan,
    title="Expo & Booth Management System API",
    description="Internal Booth Sales and Tracking System for Admins and Sales Staff",
    version="1.0.0"
)

# Enable CORS for React frontend (development and production)
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://booth-management-system-nine.vercel.app")
allowed_origins = [orig.strip().strip('"').strip("'").rstrip('/') for orig in raw_origins.split(",") if orig.strip()]
origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))

app.include_router(auth_router)
app.include_router(layout_router)

@app.middleware("http")
async def protect_mutations(request: Request, call_next):
    if request.url.path.startswith('/api/'):
        if request.url.path.startswith('/api/public/'):
            return await call_next(request)
        if request.method in ('POST','PUT','PATCH','DELETE') and request.headers.get('X-Requested-With') != 'ExpoHub':
            return JSONResponse(status_code=403,content={'detail':'A same-origin application request is required'})
        response=await call_next(request)
        response.headers['Cache-Control']='no-store'
        response.headers['X-Content-Type-Options']='nosniff'
        return response
    return await call_next(request)

@app.get("/api/events")
def get_events(db: Session = Depends(get_db), user=Depends(current_user)):
    events = db.query(models.Event).order_by(models.Event.id.asc()).all()
    results = []
    for ev in events:
        total_booths = db.query(models.Booth).filter(models.Booth.event_id == ev.id).count()
        sold_booths = db.query(models.Booth).filter(
            models.Booth.event_id == ev.id,
            models.Booth.status == "sold"
        ).count()
        hold_booths = db.query(models.Booth).filter(
            models.Booth.event_id == ev.id,
            models.Booth.status == "hold"
        ).count()
        available_booths = db.query(models.Booth).filter(
            models.Booth.event_id == ev.id,
            models.Booth.status == "available"
        ).count()

        # Calculate total revenue collected (exclude rejected notes and cancelled bookings)
        collected = db.query(func.sum(models.PaymentNote.paid_amount)).join(
            models.Booking, models.PaymentNote.booking_id == models.Booking.id
        ).filter(
            models.Booking.event_id == ev.id,
            models.PaymentNote.verification_status != "rejected",
            models.Booking.booking_status != "cancelled"
        ).scalar() or 0.0

        results.append({
            "id": ev.id,
            "layout_revision": ev.layout_revision,
            "name": ev.name,
            "name_kh": ev.name_kh,
            "venue": ev.venue,
            "start_date": ev.start_date,
            "end_date": ev.end_date,
            "status": ev.status,
            "description": ev.description,
            "banner_url": ev.banner_url,
            "total_booths": total_booths,
            "sold_booths": sold_booths,
            "hold_booths": hold_booths,
            "available_booths": available_booths,
            "occupancy_rate": round((sold_booths / total_booths * 100), 1) if total_booths > 0 else 0,
            "collected_revenue": collected,
            "canvas_width": ev.canvas_width or 1600,
            "canvas_height": ev.canvas_height or 1000
        })
    return results

@app.post("/api/events", status_code=status.HTTP_201_CREATED)
def create_event(event_in: schemas.EventCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    try:
        start = datetime.strptime(event_in.start_date, "%Y-%m-%d")
        end = datetime.strptime(event_in.end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(422, "Event dates must use YYYY-MM-DD")
    if end < start:
        raise HTTPException(422, "End date must be on or after start date")
    new_event = models.Event(
        name=event_in.name,
        name_kh=event_in.name_kh,
        venue=event_in.venue,
        start_date=event_in.start_date,
        end_date=event_in.end_date,
        status=event_in.status,
        description=event_in.description,
        banner_url=event_in.banner_url
    )
    db.add(new_event)
    db.flush()

    # Create default categories for convenience
    default_cats = [
        models.BoothCategory(
            event_id=new_event.id,
            name="VIP Island Suite",
            name_kh="ស្តង់ VIP ពិសេស",
            color_code="#8B5CF6",
            base_price=3500.0,
            dimensions="6m x 6m (36m²)",
            power_supply="32A 3-Phase / 380V"
        ),
        models.BoothCategory(
            event_id=new_event.id,
            name="Premium Corner Booth",
            name_kh="ស្តង់កែងប្រណិត Corner",
            color_code="#0EA5E9",
            base_price=2200.0,
            dimensions="3m x 6m (18m²)",
            power_supply="16A / 220V"
        ),
        models.BoothCategory(
            event_id=new_event.id,
            name="Standard Shell Scheme",
            name_kh="ស្តង់ស្ដង់ដារ Shell Scheme",
            color_code="#10B981",
            base_price=1200.0,
            dimensions="3m x 3m (9m²)",
            power_supply="5A / 220V"
        )
    ]
    db.add_all(default_cats)
    audit(db,user,'create_event',new_event.id)
    db.commit()

    return {"message": "Event created successfully", "event_id": new_event.id}

@app.put("/api/events/{event_id}")
def update_event(event_id: int, event_in: schemas.EventCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        if datetime.strptime(event_in.end_date,'%Y-%m-%d') < datetime.strptime(event_in.start_date,'%Y-%m-%d'):
            raise ValueError()
    except ValueError:
        raise HTTPException(422,'Enter valid dates; end date cannot precede the start')
    for key, value in event_in.model_dump().items():
        setattr(event, key, value)
    audit(db,user,'update_event',event_id)
    db.commit()
    return {"message": "Event updated successfully"}

@app.delete("/api/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if db.query(models.Booking).filter_by(event_id=event_id).first():
        raise HTTPException(409, "Events with booking history cannot be deleted")
    db.delete(event)
    audit(db,user,'delete_event',event_id)
    db.commit()
    return {"message": "Event deleted successfully"}

@app.get("/api/events/{event_id}/categories")
def get_event_categories(event_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    if not db.get(models.Event,event_id): raise HTTPException(404,'Event not found')
    return db.query(models.BoothCategory).filter(models.BoothCategory.event_id == event_id).all()

@app.get("/api/events/{event_id}/booths")
def get_event_booths(event_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    if not db.get(models.Event,event_id): raise HTTPException(404,'Event not found')
    booths = db.query(models.Booth).options(
        joinedload(models.Booth.category),
        joinedload(models.Booth.handover).joinedload(models.BoothHandover.staff),
        joinedload(models.Booth.bookings).joinedload(models.Booking.staff),
        joinedload(models.Booth.bookings).joinedload(models.Booking.addons),
        joinedload(models.Booth.bookings).joinedload(models.Booking.badges),
        joinedload(models.Booth.bookings).joinedload(models.Booking.payment_notes).joinedload(models.PaymentNote.recorder),
        joinedload(models.Booth.bookings).joinedload(models.Booking.payment_notes).joinedload(models.PaymentNote.verifier)
    ).filter(models.Booth.event_id == event_id).all()

    response = []
    for b in booths:
        active_booking = None
        if b.bookings:
            # Get latest non-cancelled booking
            valid_bookings = [bk for bk in b.bookings if bk.booking_status != "cancelled"]
            if valid_bookings:
                latest_b = sorted(valid_bookings, key=lambda x: x.id, reverse=True)[0]
                payment_notes_list = [
                    {
                        "id": pn.id,
                        "paid_amount": pn.paid_amount,
                        "remaining_balance": pn.remaining_balance,
                        "payment_method": pn.payment_method,
                        "reference_slip_no": pn.reference_slip_no,
                        "note_text": pn.note_text,
                        "payment_date": pn.payment_date.isoformat() if pn.payment_date else None,
                        "verification_status": pn.verification_status or "verified",
                        "verified_by": pn.verified_by,
                        "verified_by_name": pn.verifier.name if pn.verifier else None,
                        "verified_at": pn.verified_at.isoformat() if pn.verified_at else None,
                        "recorded_by": pn.recorded_by,
                        "recorder_name": pn.recorder.name if pn.recorder else None
                    }
                    for pn in latest_b.payment_notes
                ]
                addons_list = [
                    {
                        "id": a.id,
                        "service_id": a.service_id,
                        "name": a.name,
                        "name_kh": a.name_kh,
                        "category": a.category,
                        "quantity": a.quantity,
                        "unit_price": a.unit_price,
                        "total_price": a.total_price,
                        "status": a.status
                    }
                    for a in (latest_b.addons or [])
                ]
                badges_list = [
                    {
                        "id": bg.id,
                        "full_name": bg.full_name,
                        "position": bg.position,
                        "phone": bg.phone,
                        "badge_type": bg.badge_type,
                        "qr_token": bg.qr_token
                    }
                    for bg in (latest_b.badges or [])
                ]
                total_paid = sum(pn["paid_amount"] for pn in payment_notes_list if pn.get("verification_status") != "rejected")
                active_booking = {
                    "id": latest_b.id,
                    "staff_id": latest_b.staff_id,
                    "staff_name": latest_b.staff.name if latest_b.staff else "Unknown seller",
                    "sales_notes": latest_b.sales_notes,
                    "exhibitor_name": latest_b.exhibitor_name,
                    "contact_person": latest_b.contact_person,
                    "phone": latest_b.phone,
                    "telegram": latest_b.telegram,
                    "email": latest_b.email,
                    "business_type": latest_b.business_type,
                    "fascia_name": latest_b.fascia_name,
                    "booking_status": latest_b.booking_status,
                    "hold_expires_at": latest_b.hold_expires_at,
                    "total_agreed_price": latest_b.total_agreed_price,
                    "total_paid": total_paid,
                    "remaining_due": max(0.0, latest_b.total_agreed_price - total_paid),
                    "created_at": latest_b.created_at.isoformat() if latest_b.created_at else None,
                    "payment_notes": payment_notes_list,
                    "addons": addons_list,
                    "badges": badges_list
                }

        handover_data = None
        if b.handover:
            handover_data = {
                "id": b.handover.id,
                "recipient_name": b.handover.recipient_name,
                "recipient_phone": b.handover.recipient_phone,
                "checklist_data": b.handover.checklist_data,
                "status": b.handover.status,
                "remarks": b.handover.remarks,
                "signoff_confirmed": b.handover.signoff_confirmed,
                "checked_in_at": b.handover.checked_in_at.isoformat() if b.handover.checked_in_at else None,
                "staff_id": b.handover.staff_id,
                "staff_name": b.handover.staff.name if b.handover.staff else None
            }

        response.append({
            "id": b.id,
            "pos_x": b.pos_x, "pos_y": b.pos_y, "size_w": b.size_w, "size_h": b.size_h,
            "event_id": b.event_id,
            "category_id": b.category_id,
            "category_name": b.category.name if b.category else "Standard",
            "category_name_kh": b.category.name_kh if b.category else "ស្តង់ស្ដង់ដារ",
            "category_color": b.category.color_code if b.category else "#10B981",
            "dimensions": f"{b.size_w / 40:g}m x {b.size_h / 40:g}m ({b.size_w * b.size_h / 1600:g} m²)" if b.pos_x is not None else (b.category.dimensions if b.category else "3m x 3m"),
            "power_supply": b.category.power_supply if b.category else "5A / 220V",
            "booth_code": b.booth_code,
            "zone": b.zone,
            "row_pos": b.row_pos,
            "col_pos": b.col_pos,
            "width_units": b.width_units,
            "height_units": b.height_units,
            "status": b.status,
            "price": b.price,
            "has_3d_view": b.has_3d_view,
            "model_3d_url": b.model_3d_url,
            "notes": b.notes,
            "active_booking": active_booking,
            "handover": handover_data
        })

    return response

@app.post("/api/booths", status_code=status.HTTP_201_CREATED)
def create_booth(booth_in: schemas.BoothCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    if not db.get(models.Event, booth_in.event_id):
        raise HTTPException(404, "Event not found")
    if booth_in.category_id and not db.query(models.BoothCategory).filter_by(id=booth_in.category_id, event_id=booth_in.event_id).first():
        raise HTTPException(400, "Category must belong to this event")
    if db.query(models.Booth).filter_by(event_id=booth_in.event_id, booth_code=booth_in.booth_code).first():
        raise HTTPException(409, "Booth code already exists in this event")
    new_booth = models.Booth(
        event_id=booth_in.event_id,
        category_id=booth_in.category_id,
        booth_code=booth_in.booth_code,
        zone=booth_in.zone,
        row_pos=booth_in.row_pos,
        col_pos=booth_in.col_pos,
        width_units=booth_in.width_units,
        height_units=booth_in.height_units,
        status=booth_in.status,
        price=booth_in.price,
        has_3d_view=booth_in.has_3d_view,
        model_3d_url=booth_in.model_3d_url or "/assets/booth_standard_3d.jpg",
        notes=booth_in.notes
    )
    db.add(new_booth)
    db.query(models.Event).filter_by(id=booth_in.event_id).update({'layout_revision':models.Event.layout_revision+1})
    db.flush()
    audit(db,user,'create_booth',new_booth.id)
    db.commit()
    db.refresh(new_booth)
    return {"message": "Booth created successfully", "booth_id": new_booth.id}

@app.put("/api/booths/{booth_id}")
def update_booth(booth_id: int, booth_in: schemas.BoothUpdate, db: Session = Depends(get_db), user=Depends(require_admin)):
    booth = db.query(models.Booth).filter(models.Booth.id == booth_id).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    
    update_data = booth_in.model_dump(exclude_unset=True)
    if any(value is None for key, value in update_data.items() if key not in ("category_id", "model_3d_url", "notes")):
        raise HTTPException(422, "Required booth fields cannot be null")
    if "status" in update_data and booth.status in ("hold", "sold"):
        raise HTTPException(409, "Use the booking workflow to change a reserved booth")
    if update_data.get("category_id") and not db.query(models.BoothCategory).filter_by(id=update_data["category_id"], event_id=booth.event_id).first():
        raise HTTPException(400, "Category must belong to this event")
    if "booth_code" in update_data and db.query(models.Booth).filter(models.Booth.event_id == booth.event_id, models.Booth.booth_code == update_data["booth_code"], models.Booth.id != booth_id).first():
        raise HTTPException(409, "Booth code already exists in this event")
    for key, value in update_data.items():
        setattr(booth, key, value)
    
    db.query(models.Event).filter_by(id=booth.event_id).update({'layout_revision':models.Event.layout_revision+1})
    audit(db,user,'update_booth',booth_id)
    db.commit()
    return {"message": "Booth updated successfully"}

@app.delete("/api/booths/{booth_id}")
def delete_booth(booth_id: int, db: Session = Depends(get_db), user=Depends(require_admin)):
    booth = db.query(models.Booth).filter(models.Booth.id == booth_id).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    if booth.bookings:
        raise HTTPException(409, "Booths with booking history cannot be deleted")
    db.delete(booth)
    db.query(models.Event).filter_by(id=booth.event_id).update({'layout_revision':models.Event.layout_revision+1})
    audit(db,user,'delete_booth',booth_id)
    db.commit()
    return {"message": "Booth deleted successfully"}

@app.post("/api/booths/{booth_id}/book")
def book_booth(booth_id: int, booking_in: schemas.BookingCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    booth = db.query(models.Booth).filter(models.Booth.id == booth_id).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    
    if booking_in.booth_id != booth_id or booking_in.event_id != booth.event_id:
        raise HTTPException(400, "Booking event and booth do not match")
    initial = money(booking_in.initial_payment.paid_amount) if booking_in.initial_payment else Decimal("0")
    price = money(booking_in.total_agreed_price)
    if initial > price:
        raise HTTPException(400, "Payment exceeds the agreed price")
    if booking_in.booking_status not in ("hold", "confirmed") and initial <= 0:
        raise HTTPException(400, "A sold booking requires a positive payment")
    if booking_in.booking_status == "fully_paid" and initial != price:
        raise HTTPException(400, "Full payment must equal the agreed price")
    if any(b.booking_status != "cancelled" for b in booth.bookings):
        raise HTTPException(409, "This booth already has a booking; review its existing record")
    # Conditional write reserves the booth within the same transaction as its booking.
    claimed = db.query(models.Booth).filter(models.Booth.id == booth_id, models.Booth.status == "available").update({"status": "hold"}, synchronize_session=False)
    if not claimed:
        db.rollback()
        raise HTTPException(409, "Booth is already reserved or unavailable; open the existing booking")

    expires_at = None
    if booking_in.booking_status == "hold":
        now = utc_now()
        expires_at = (now + timedelta(hours=booking_in.hold_hours)).strftime("%Y-%m-%d %H:%M:%S")

    new_booking = models.Booking(
        booth_id=booth.id,
        event_id=booth.event_id,
        staff_id=user.id,
        exhibitor_name=booking_in.exhibitor_name,
        contact_person=booking_in.contact_person,
        phone=booking_in.phone,
        telegram=booking_in.telegram,
        email=booking_in.email,
        business_type=booking_in.business_type,
        fascia_name=booking_in.fascia_name or booking_in.exhibitor_name,
        booking_status=booking_in.booking_status,
        hold_expires_at=expires_at,
        sales_notes=booking_in.sales_notes,
        total_agreed_price=float(price)
    )
    db.add(new_booking)
    db.flush()

    # If initial payment note provided
    if booking_in.initial_payment:
        is_finance = user.role in ("admin", "accountant")
        v_status = "verified" if is_finance else "pending"
        v_by = user.id if is_finance else None
        v_at = utc_now() if is_finance else None
        pay_note = models.PaymentNote(
            booking_id=new_booking.id,
            recorded_by=user.id,
            paid_amount=float(initial),
            remaining_balance=float(price - initial),
            payment_date=booking_in.initial_payment.payment_date or utc_now(),
            payment_method=booking_in.initial_payment.payment_method,
            reference_slip_no=booking_in.initial_payment.reference_slip_no,
            note_text=booking_in.initial_payment.note_text,
            verification_status=v_status,
            verified_by=v_by,
            verified_at=v_at
        )
        db.add(pay_note)

    # Update booth status
    if initial > 0:
        booth.status = "sold"
        new_booking.booking_status = "fully_paid" if initial == price else "deposit_paid"
        new_booking.hold_expires_at = None
    elif booking_in.booking_status == "confirmed":
        booth.status = "sold"
    else:
        booth.status = "hold"
    audit(db,user,"booking.created",new_booking.id)
    db.commit()

    return {"message": "Booth booked successfully", "booking_id": new_booking.id}

@app.post("/api/bookings/{booking_id}/payment-note")
def add_payment_note(booking_id: int, note_in: schemas.PaymentNoteCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    own_booking(user, booking)
    if booking.booking_status == "cancelled":
        raise HTTPException(409, "Cannot pay a cancelled booking")
    # Serialize writes before calculating the balance, including SQLite writers.
    db.query(models.Booking).filter_by(id=booking_id).update({"booking_status": models.Booking.booking_status}, synchronize_session=False)
    db.refresh(booking)
    if booking.booking_status == 'cancelled': raise HTTPException(409,'Cannot pay a cancelled booking')
    paid = sum((money(p.paid_amount) for p in db.query(models.PaymentNote).filter(models.PaymentNote.booking_id == booking_id, models.PaymentNote.verification_status != "rejected")), Decimal("0"))
    remaining = money(booking.total_agreed_price) - paid
    amount = money(note_in.paid_amount)
    if amount <= 0 or amount > remaining:
        raise HTTPException(400, "Payment must be positive and cannot exceed the outstanding balance")
    balance = remaining - amount
    is_finance = user.role in ("admin", "accountant")
    v_status = "verified" if is_finance else "pending"
    v_by = user.id if is_finance else None
    v_at = utc_now() if is_finance else None
    db.add(models.PaymentNote(
        booking_id=booking.id, recorded_by=user.id,
        paid_amount=float(amount), remaining_balance=float(balance),
        payment_method=note_in.payment_method, reference_slip_no=note_in.reference_slip_no,
        note_text=note_in.note_text, payment_date=note_in.payment_date or utc_now(),
        verification_status=v_status,
        verified_by=v_by,
        verified_at=v_at
    ))
    booking.booking_status = "fully_paid" if balance == 0 else "deposit_paid"
    booking.hold_expires_at = None
    booth = db.get(models.Booth, booking.booth_id)
    if booth:
        booth.status = "sold"

    audit(db,user,'add_payment_note',booking_id)
    db.commit()
    return {"message": "Payment note recorded successfully"}

@app.post("/api/booths/{booth_id}/release")
def release_booth(booth_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    booth = db.query(models.Booth).filter(models.Booth.id == booth_id).first()
    if not booth:
        raise HTTPException(status_code=404, detail="Booth not found")
    
    db.query(models.Booth).filter_by(id=booth_id).update({'status':models.Booth.status},synchronize_session=False)
    db.refresh(booth)
    db.expire(booth,['bookings'])
    for booking in booth.bookings:
        if booking.booking_status != "cancelled": own_booking(user, booking)
    has_valid_payments = any(any(pn.verification_status != "rejected" for pn in bk.payment_notes) for bk in booth.bookings if bk.booking_status != "cancelled")
    if booth.status not in ("hold", "sold") or has_valid_payments:
        raise HTTPException(409, "Only unpaid holds can be released")
    booth.status = "available"
    # Mark active bookings as cancelled
    for bk in booth.bookings:
        if bk.booking_status in ["hold", "confirmed"]:
            bk.booking_status = "cancelled"
    
    audit(db,user,'release_booth',booth_id)
    db.commit()
    return {"message": "Booth released to available status"}


@app.post('/api/bookings/{booking_id}/confirm')
def confirm_sale(booking_id:int,user=Depends(current_user),db:Session=Depends(get_db)):
    booking=db.get(models.Booking,booking_id)
    if not booking: raise HTTPException(404,'Booking not found')
    own_booking(user,booking)
    db.query(models.Booking).filter_by(id=booking_id).update({'booking_status':models.Booking.booking_status},synchronize_session=False)
    db.refresh(booking)
    if booking.booking_status != 'hold': raise HTTPException(409,'Only an active hold can be confirmed')
    booth=db.get(models.Booth,booking.booth_id)
    if not booth or booth.status != 'hold': raise HTTPException(409,'Booth status does not match this hold')
    booking.booking_status='confirmed';booking.hold_expires_at=None;booth.status='sold'
    audit(db,user,'sale.confirmed',booking_id);db.commit()
    return {'message':'Sale confirmed; payment can be recorded later'}

class ExtendHoldPayload(BaseModel):
    hours: int = Field(default=24, ge=1, le=720)

class PublicInquiryPayload(BaseModel):
    booth_code: str
    company_name: str
    contact_person: str
    phone: str
    email: Optional[str] = None
    telegram: Optional[str] = None
    notes: Optional[str] = None

@app.post("/api/payment-notes/{note_id}/verify")
def verify_payment_note(note_id: int, db: Session = Depends(get_db), user=Depends(require_finance_or_admin)):
    note = db.get(models.PaymentNote, note_id)
    if not note:
        raise HTTPException(404, "Payment note not found")
    note.verification_status = "verified"
    note.verified_by = user.id
    note.verified_at = utc_now()
    audit(db, user, "payment.verified", note_id)
    db.commit()
    return {"message": "Payment verified successfully", "note_id": note_id}

@app.post("/api/payment-notes/{note_id}/reject")
def reject_payment_note(note_id: int, db: Session = Depends(get_db), user=Depends(require_finance_or_admin)):
    note = db.get(models.PaymentNote, note_id)
    if not note:
        raise HTTPException(404, "Payment note not found")
    note.verification_status = "rejected"
    note.verified_by = user.id
    note.verified_at = utc_now()
    
    # Recalculate booking status based on remaining non-rejected payments
    booking = note.booking
    if booking:
        valid_notes = [pn for pn in booking.payment_notes if pn.id != note_id and pn.verification_status != "rejected"]
        valid_paid = sum(Decimal(str(pn.paid_amount)) for pn in valid_notes)
        agreed_price = Decimal(str(booking.total_agreed_price))
        booth = booking.booth
        if valid_paid >= agreed_price:
            booking.booking_status = "fully_paid"
        elif valid_paid > 0:
            booking.booking_status = "deposit_paid"
        else:
            # If no valid payments remain
            booking.booking_status = "confirmed" if (booth and booth.status == "sold") else "hold"
            if booth and booking.booking_status == "hold":
                booth.status = "hold"

    audit(db, user, "payment.rejected", note_id)
    db.commit()
    return {"message": "Payment marked as rejected", "note_id": note_id}

@app.post("/api/events/{event_id}/release-expired-holds")
def release_expired_holds(event_id: int, db: Session = Depends(get_db), user=Depends(require_manager_or_admin)):
    now_str = utc_now().strftime("%Y-%m-%d %H:%M:%S")
    expired_bookings = db.query(models.Booking).join(
        models.Booth, models.Booking.booth_id == models.Booth.id
    ).filter(
        models.Booking.event_id == event_id,
        models.Booking.booking_status == "hold",
        models.Booth.status == "hold",
        models.Booking.hold_expires_at.isnot(None),
        models.Booking.hold_expires_at <= now_str
    ).all()

    count = 0
    for bk in expired_bookings:
        if any(pn.verification_status != "rejected" for pn in bk.payment_notes):
            continue
        bk.booking_status = "cancelled"
        booth = db.get(models.Booth, bk.booth_id)
        if booth and booth.status == "hold":
            booth.status = "available"
            count += 1
            audit(db, user, "hold.auto_released", booth.id)
    if count > 0:
        db.commit()
    return {"message": f"Released {count} expired hold booths", "count": count}

@app.post("/api/bookings/{booking_id}/extend-hold")
def extend_hold(booking_id: int, payload: ExtendHoldPayload, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    own_booking(user, booking)
    if booking.booking_status != "hold":
        raise HTTPException(400, "Only active holds can be extended")
    
    current_expiry = utc_now()
    if booking.hold_expires_at:
        try:
            current_expiry = datetime.strptime(booking.hold_expires_at, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            pass
    if current_expiry < utc_now():
        current_expiry = utc_now()
    new_expiry = current_expiry + timedelta(hours=payload.hours)
    booking.hold_expires_at = new_expiry.strftime("%Y-%m-%d %H:%M:%S")
    audit(db, user, "hold.extended", booking_id)
    db.commit()
    return {"message": f"Hold extended by {payload.hours} hours", "hold_expires_at": booking.hold_expires_at}

@app.get("/api/public/events/{event_id}/floorplan")
def get_public_floorplan(event_id: int, db: Session = Depends(get_db)):
    event = db.get(models.Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    booths = db.query(models.Booth).options(
        joinedload(models.Booth.category),
        joinedload(models.Booth.bookings)
    ).filter(models.Booth.event_id == event_id).all()
    
    booth_list = []
    for b in booths:
        exhibitor = None
        if b.bookings:
            valid = [bk for bk in b.bookings if bk.booking_status != "cancelled"]
            if valid and b.status == "sold":
                exhibitor = sorted(valid, key=lambda x: x.id, reverse=True)[0].exhibitor_name
        booth_list.append({
            "id": b.id,
            "booth_code": b.booth_code,
            "zone": b.zone,
            "status": b.status,
            "category_name": b.category.name if b.category else "Standard",
            "category_name_kh": b.category.name_kh if b.category else "ស្តង់ស្ដង់ដារ",
            "category_color": b.category.color_code if b.category else "#10B981",
            "price": b.price,
            "dimensions": f"{b.size_w / 40:g}m x {b.size_h / 40:g}m" if b.pos_x is not None else (b.category.dimensions if b.category else "3m x 3m"),
            "exhibitor_name": exhibitor,
            "pos_x": b.pos_x,
            "pos_y": b.pos_y,
            "size_w": b.size_w,
            "size_h": b.size_h,
            "has_3d_view": b.has_3d_view,
            "model_3d_url": b.model_3d_url
        })
    return {
        "event": {
            "id": event.id,
            "name": event.name,
            "name_kh": event.name_kh,
            "venue": event.venue,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "canvas_width": event.canvas_width or 1600,
            "canvas_height": event.canvas_height or 1000,
            "banner_url": event.banner_url
        },
        "booths": booth_list
    }

@app.post("/api/public/events/{event_id}/inquire")
def submit_public_inquiry(event_id: int, inquiry: PublicInquiryPayload, db: Session = Depends(get_db)):
    event = db.get(models.Event, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    booth = db.query(models.Booth).filter_by(event_id=event_id, booth_code=inquiry.booth_code).first()
    if not booth:
        raise HTTPException(404, "Booth not found")
    note_line = f"\n[Inquiry from {inquiry.company_name} ({inquiry.contact_person}, Tel: {inquiry.phone})]: {inquiry.notes or 'Interested in booking'}"
    booth.notes = (booth.notes or "") + note_line
    db.add(models.AuditLog(user_id=None, action="public.inquiry", target=f"Booth {booth.booth_code} - {inquiry.company_name}"))
    db.commit()
    return {"message": "Inquiry submitted successfully. Our team will contact you shortly!"}

@app.get("/api/analytics/{event_id}")
def get_analytics(event_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    if not db.get(models.Event,event_id): raise HTTPException(404,'Event not found')
    booths = db.query(models.Booth).filter(models.Booth.event_id == event_id).all()
    total_booths = len(booths)
    sold_count = sum(1 for b in booths if b.status == "sold")
    hold_count = sum(1 for b in booths if b.status == "hold")
    available_count = sum(1 for b in booths if b.status == "available")
    blocked_count = sum(1 for b in booths if b.status == "blocked")

    occupancy_rate = round((sold_count / total_booths * 100), 1) if total_booths > 0 else 0.0

    # Total potential value of all booths
    total_capacity_value = sum(b.price for b in booths)
    
    # Contracted total from bookings
    bookings = db.query(models.Booking).filter(
        models.Booking.event_id == event_id,
        models.Booking.booking_status != "cancelled"
    ).all()
    
    contracted_revenue = sum(bk.total_agreed_price for bk in bookings)
    
    # Actual cash collected recorded in valid payment notes
    payment_notes = db.query(models.PaymentNote).join(
        models.Booking, models.PaymentNote.booking_id == models.Booking.id
    ).filter(
        models.Booking.event_id == event_id,
        models.PaymentNote.verification_status != "rejected"
    ).all()

    cash_collected = sum(pn.paid_amount for pn in payment_notes)
    receivables = max(0.0, contracted_revenue - cash_collected)

    # Category breakdown
    categories = db.query(models.BoothCategory).filter(models.BoothCategory.event_id == event_id).all()
    cat_breakdown = []
    for cat in categories:
        cat_booths = [b for b in booths if b.category_id == cat.id]
        cat_total = len(cat_booths)
        cat_sold = sum(1 for b in cat_booths if b.status == "sold")
        cat_revenue = sum(b.price for b in cat_booths if b.status == "sold")
        cat_breakdown.append({
            "category_id": cat.id,
            "category_name": cat.name,
            "category_name_kh": cat.name_kh,
            "color_code": cat.color_code,
            "total_booths": cat_total,
            "sold_booths": cat_sold,
            "revenue": cat_revenue,
            "occupancy_rate": round((cat_sold / cat_total * 100), 1) if cat_total > 0 else 0
        })

    # Sales Leaderboard
    users = db.query(models.User).filter(models.User.role == "staff").all()
    leaderboard = []
    for u in users:
        staff_bookings = [bk for bk in bookings if bk.staff_id == u.id and bk.booking_status in ("confirmed", "deposit_paid", "fully_paid")]
        booths_sold = len(staff_bookings)
        sales_vol = sum(bk.total_agreed_price for bk in staff_bookings)
        leaderboard.append({
            "staff_id": u.id,
            "name": u.name,
            "phone": u.phone,
            "booths_sold": booths_sold,
            "total_volume": sales_vol
        })
    leaderboard = sorted(leaderboard, key=lambda x: x["total_volume"], reverse=True)

    monthly = {}
    for bk in bookings:
        key = bk.created_at.strftime("%Y-%m") if bk.created_at else "Unknown"
        monthly.setdefault(key, {"contracted": 0, "collected": 0})["contracted"] += bk.total_agreed_price
    for pn in payment_notes:
        key = pn.payment_date.strftime("%Y-%m") if pn.payment_date else "Unknown"
        monthly.setdefault(key, {"contracted": 0, "collected": 0})["collected"] += pn.paid_amount
    return {
        "monthly_revenue": [{"month": k, **v} for k, v in sorted(monthly.items())],
        "event_id": event_id,
        "total_booths": total_booths,
        "sold_count": sold_count,
        "hold_count": hold_count,
        "available_count": available_count,
        "blocked_count": blocked_count,
        "occupancy_rate": occupancy_rate,
        "total_capacity_value": total_capacity_value,
        "contracted_revenue": contracted_revenue,
        "cash_collected": cash_collected,
        "receivables": receivables,
        "category_breakdown": cat_breakdown,
        "leaderboard": leaderboard
    }

import uuid

# --- Addon Services Catalog & Booking Addons ---

@app.get("/api/events/{event_id}/addons")
def get_event_addons(event_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    addons = db.query(models.AddonService).filter(
        (models.AddonService.event_id == event_id) | (models.AddonService.event_id == None),
        models.AddonService.is_active == True
    ).order_by(models.AddonService.category.asc(), models.AddonService.id.asc()).all()
    return addons

@app.post("/api/events/{event_id}/addons", status_code=status.HTTP_201_CREATED)
def create_event_addon(event_id: int, payload: schemas.AddonServiceCreate, db: Session = Depends(get_db), user=Depends(require_admin)):
    new_addon = models.AddonService(
        event_id=event_id,
        name=payload.name,
        name_kh=payload.name_kh,
        category=payload.category,
        unit_price=payload.unit_price,
        unit_name=payload.unit_name,
        icon=payload.icon or "Package",
        is_active=payload.is_active
    )
    db.add(new_addon)
    db.commit()
    db.refresh(new_addon)
    return new_addon

@app.get("/api/bookings/{booking_id}/addons")
def get_booking_addons(booking_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    return booking.addons

@app.post("/api/bookings/{booking_id}/addons", status_code=status.HTTP_201_CREATED)
def add_booking_addon(booking_id: int, payload: schemas.BookingAddonCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    own_booking(user, booking)
    if booking.booking_status == "cancelled":
        raise HTTPException(409, "Cannot add addons to a cancelled booking")
    
    total_price = float(payload.quantity * payload.unit_price)
    new_item = models.BookingAddon(
        booking_id=booking_id,
        service_id=payload.service_id,
        name=payload.name,
        name_kh=payload.name_kh,
        category=payload.category,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_price=total_price,
        status="delivered"
    )
    booking.total_agreed_price = round(booking.total_agreed_price + total_price, 2)
    db.add(new_item)

    # Recalculate booking status based on non-rejected payments
    valid_paid = sum(
        Decimal(str(pn.paid_amount))
        for pn in booking.payment_notes
        if pn.verification_status != "rejected"
    )
    agreed = Decimal(str(booking.total_agreed_price))
    if valid_paid >= agreed and agreed > 0:
        booking.booking_status = "fully_paid"
    elif valid_paid > 0:
        booking.booking_status = "deposit_paid"
    elif booking.booking_status in ("fully_paid", "deposit_paid"):
        booking.booking_status = "confirmed"

    audit(db, user, "addon.added", booking_id)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.delete("/api/bookings/{booking_id}/addons/{addon_id}")
def delete_booking_addon(booking_id: int, addon_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    own_booking(user, booking)

    item = db.query(models.BookingAddon).filter(
        models.BookingAddon.id == addon_id,
        models.BookingAddon.booking_id == booking_id
    ).first()
    if not item:
        raise HTTPException(404, "Addon item not found")
    
    booking.total_agreed_price = max(0.0, round(booking.total_agreed_price - item.total_price, 2))
    db.delete(item)

    # Recalculate booking status based on non-rejected payments
    valid_paid = sum(
        Decimal(str(pn.paid_amount))
        for pn in booking.payment_notes
        if pn.verification_status != "rejected"
    )
    agreed = Decimal(str(booking.total_agreed_price))
    if valid_paid >= agreed and agreed > 0:
        booking.booking_status = "fully_paid"
    elif valid_paid > 0:
        booking.booking_status = "deposit_paid"
    elif booking.booking_status in ("fully_paid", "deposit_paid"):
        booking.booking_status = "confirmed"

    audit(db, user, "addon.deleted", booking_id)
    db.commit()
    return {"ok": True}

# --- Exhibitor Badges ---

@app.get("/api/bookings/{booking_id}/badges")
def get_booking_badges(booking_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    return booking.badges

@app.post("/api/bookings/{booking_id}/badges", status_code=status.HTTP_201_CREATED)
def create_booking_badge(booking_id: int, payload: schemas.ExhibitorBadgeCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    own_booking(user, booking)
    if booking.booking_status == "cancelled":
        raise HTTPException(409, "Cannot issue badges for a cancelled booking")
    
    unique_token = f"EH-{booking.event_id}-{booking_id}-{uuid.uuid4().hex[:6].upper()}"
    new_badge = models.ExhibitorBadge(
        booking_id=booking_id,
        full_name=payload.full_name,
        position=payload.position,
        phone=payload.phone,
        badge_type=payload.badge_type,
        qr_token=unique_token
    )
    db.add(new_badge)
    audit(db, user, "badge.created", booking_id)
    db.commit()
    db.refresh(new_badge)
    return new_badge

@app.delete("/api/bookings/{booking_id}/badges/{badge_id}")
def delete_booking_badge(booking_id: int, badge_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    booking = db.get(models.Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    own_booking(user, booking)

    badge = db.query(models.ExhibitorBadge).filter(
        models.ExhibitorBadge.id == badge_id,
        models.ExhibitorBadge.booking_id == booking_id
    ).first()
    if not badge:
        raise HTTPException(404, "Badge not found")
    db.delete(badge)
    audit(db, user, "badge.deleted", booking_id)
    db.commit()
    return {"ok": True}

# --- Move-in Check-in & Booth Handover Protocol ---

@app.get("/api/booths/{booth_id}/handover")
def get_booth_handover(booth_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    handover = db.query(models.BoothHandover).filter(models.BoothHandover.booth_id == booth_id).first()
    if not handover:
        return None
    return {
        "id": handover.id,
        "booth_id": handover.booth_id,
        "booking_id": handover.booking_id,
        "staff_id": handover.staff_id,
        "staff_name": handover.staff.name if handover.staff else None,
        "recipient_name": handover.recipient_name,
        "recipient_phone": handover.recipient_phone,
        "checklist_data": handover.checklist_data,
        "status": handover.status,
        "remarks": handover.remarks,
        "signoff_confirmed": handover.signoff_confirmed,
        "checked_in_at": handover.checked_in_at.isoformat() if handover.checked_in_at else None
    }

@app.post("/api/booths/{booth_id}/handover")
def record_booth_handover(booth_id: int, payload: schemas.BoothHandoverCreate, db: Session = Depends(get_db), user=Depends(current_user)):
    booth = db.get(models.Booth, booth_id)
    if not booth:
        raise HTTPException(404, "Booth not found")
    
    booking = None
    if booth.bookings:
        valid_b = [bk for bk in booth.bookings if bk.booking_status != "cancelled"]
        if valid_b:
            booking = sorted(valid_b, key=lambda x: x.id, reverse=True)[0]
    
    handover = db.query(models.BoothHandover).filter(models.BoothHandover.booth_id == booth_id).first()
    if not handover:
        handover = models.BoothHandover(
            booth_id=booth_id,
            booking_id=booking.id if booking else None,
            staff_id=user.id,
            recipient_name=payload.recipient_name,
            recipient_phone=payload.recipient_phone,
            checklist_data=payload.checklist_data,
            status=payload.status,
            remarks=payload.remarks,
            signoff_confirmed=payload.signoff_confirmed
        )
        db.add(handover)
    else:
        handover.recipient_name = payload.recipient_name
        handover.recipient_phone = payload.recipient_phone
        handover.checklist_data = payload.checklist_data
        handover.status = payload.status
        handover.remarks = payload.remarks
        handover.signoff_confirmed = payload.signoff_confirmed
        handover.staff_id = user.id
        handover.checked_in_at = utc_now()
    
    db.commit()
    db.refresh(handover)
    return {
        "id": handover.id,
        "booth_id": handover.booth_id,
        "booking_id": handover.booking_id,
        "staff_id": handover.staff_id,
        "staff_name": user.name,
        "recipient_name": handover.recipient_name,
        "recipient_phone": handover.recipient_phone,
        "checklist_data": handover.checklist_data,
        "status": handover.status,
        "remarks": handover.remarks,
        "signoff_confirmed": handover.signoff_confirmed,
        "checked_in_at": handover.checked_in_at.isoformat() if handover.checked_in_at else None
    }

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = Path(dist_dir, full_path).resolve()
        if not file_path.is_relative_to(Path(dist_dir).resolve()):
            raise HTTPException(404, "Not found")
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

