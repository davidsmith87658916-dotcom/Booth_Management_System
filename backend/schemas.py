from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: str
    role: Literal["admin", "staff", "accountant"] = "staff"
    phone: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    name_kh: Optional[str] = None
    color_code: str = "#6366f1"
    base_price: float = Field(default=1200.0, ge=0, allow_inf_nan=False)
    dimensions: str = "3m x 3m"
    power_supply: Optional[str] = "5A / 220V"
    description: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    event_id: int
    class Config:
        from_attributes = True

class PaymentNoteCreate(BaseModel):
    paid_amount: float = Field(gt=0, multiple_of=0.01, allow_inf_nan=False)
    remaining_balance: float = Field(default=0, ge=0, allow_inf_nan=False)
    payment_date: Optional[datetime] = None
    payment_method: str = "ABA Transfer"
    reference_slip_no: Optional[str] = None
    note_text: Optional[str] = None
    recorded_by: Optional[int] = None
    verification_status: Optional[str] = "pending"

class PaymentNoteOut(BaseModel):
    id: int
    booking_id: int
    recorded_by: Optional[int] = None
    paid_amount: float
    remaining_balance: float
    payment_method: str
    reference_slip_no: Optional[str] = None
    note_text: Optional[str] = None
    payment_date: Optional[datetime] = None
    verification_status: str = "verified"
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    booth_id: int
    event_id: int
    staff_id: Optional[int] = None
    exhibitor_name: str = Field(min_length=1)
    contact_person: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    telegram: Optional[str] = None
    email: Optional[str] = None
    business_type: Optional[str] = None
    fascia_name: Optional[str] = None
    booking_status: Literal["hold", "confirmed", "deposit_paid", "fully_paid"] = "hold"
    hold_hours: int = Field(default=48, ge=1, le=720)
    total_agreed_price: float = Field(gt=0, multiple_of=0.01, allow_inf_nan=False)
    initial_payment: Optional[PaymentNoteCreate] = None
    sales_notes: Optional[str] = Field(default=None, max_length=4000)

class AddonServiceBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    name_kh: Optional[str] = None
    category: str = "furniture"
    unit_price: float = Field(default=10.0, ge=0)
    unit_name: str = "unit"
    icon: Optional[str] = "Package"
    is_active: bool = True

class AddonServiceCreate(AddonServiceBase):
    event_id: Optional[int] = None

class AddonServiceOut(AddonServiceBase):
    id: int
    event_id: Optional[int] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class BookingAddonCreate(BaseModel):
    service_id: Optional[int] = None
    name: str = Field(min_length=1)
    name_kh: Optional[str] = None
    category: str = "furniture"
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(ge=0)

class BookingAddonOut(BaseModel):
    id: int
    booking_id: int
    service_id: Optional[int] = None
    name: str
    name_kh: Optional[str] = None
    category: str
    quantity: int
    unit_price: float
    total_price: float
    status: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ExhibitorBadgeCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    position: Optional[str] = None
    phone: Optional[str] = None
    badge_type: str = "exhibitor"

class ExhibitorBadgeOut(BaseModel):
    id: int
    booking_id: int
    full_name: str
    position: Optional[str] = None
    phone: Optional[str] = None
    badge_type: str
    qr_token: Optional[str] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class BoothHandoverCreate(BaseModel):
    recipient_name: str = Field(min_length=1, max_length=150)
    recipient_phone: Optional[str] = None
    checklist_data: str = "{}"
    status: str = "passed"
    remarks: Optional[str] = None
    signoff_confirmed: bool = True

class BoothHandoverOut(BaseModel):
    id: int
    booth_id: int
    booking_id: Optional[int] = None
    staff_id: Optional[int] = None
    recipient_name: str
    recipient_phone: Optional[str] = None
    checklist_data: str
    status: str
    remarks: Optional[str] = None
    signoff_confirmed: bool
    checked_in_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class BookingOut(BaseModel):
    id: int
    booth_id: int
    event_id: int
    staff_id: Optional[int] = None
    exhibitor_name: str
    contact_person: str
    phone: str
    telegram: Optional[str] = None
    email: Optional[str] = None
    business_type: Optional[str] = None
    fascia_name: Optional[str] = None
    booking_status: str
    hold_expires_at: Optional[str] = None
    total_agreed_price: float
    created_at: Optional[datetime] = None
    payment_notes: List[PaymentNoteOut] = []
    addons: List[BookingAddonOut] = []
    badges: List[ExhibitorBadgeOut] = []
    handover: Optional[BoothHandoverOut] = None
    class Config:
        from_attributes = True

class BoothBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    booth_code: str = Field(min_length=1, max_length=50)
    zone: str = Field(default="Hall A", min_length=1, max_length=100)
    row_pos: int = Field(default=1, ge=1)
    col_pos: int = Field(default=1, ge=1)
    width_units: int = Field(default=1, ge=1)
    height_units: int = Field(default=1, ge=1)
    status: Literal["available", "hold", "sold", "blocked"] = "available"
    price: float = Field(default=1200.0, ge=0, allow_inf_nan=False)
    category_id: Optional[int] = None
    has_3d_view: bool = True
    model_3d_url: Optional[str] = None
    notes: Optional[str] = None

class BoothCreate(BoothBase):
    status: Literal["available", "blocked"] = "available"
    event_id: int

class BoothUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    booth_code: Optional[str] = Field(default=None, min_length=1, max_length=50)
    zone: Optional[str] = Field(default=None, min_length=1)
    row_pos: Optional[int] = Field(default=None, ge=1)
    col_pos: Optional[int] = Field(default=None, ge=1)
    width_units: Optional[int] = Field(default=None, ge=1)
    height_units: Optional[int] = Field(default=None, ge=1)
    status: Optional[Literal["available", "blocked"]] = None
    price: Optional[float] = Field(default=None, ge=0, allow_inf_nan=False)
    category_id: Optional[int] = None
    has_3d_view: Optional[bool] = None
    model_3d_url: Optional[str] = None
    notes: Optional[str] = None

class BoothOut(BoothBase):
    id: int
    event_id: int
    category: Optional[CategoryOut] = None
    bookings: List[BookingOut] = []
    handover: Optional[BoothHandoverOut] = None
    class Config:
        from_attributes = True

class EventBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str
    name_kh: Optional[str] = None
    venue: str = Field(min_length=1, max_length=255)
    start_date: str
    end_date: str
    status: str = "active"
    description: Optional[str] = None
    banner_url: Optional[str] = None
    canvas_width: Optional[int] = Field(default=1600, ge=400, le=5000)
    canvas_height: Optional[int] = Field(default=1000, ge=300, le=5000)

class EventCreate(EventBase):
    pass

class EventOut(EventBase):
    id: int
    total_booths: Optional[int] = 0
    created_at: Optional[datetime] = None
    categories: List[CategoryOut] = []
    class Config:
        from_attributes = True
