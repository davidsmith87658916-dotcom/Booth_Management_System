from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(20), default="staff")  # "admin", "staff", or "accountant"
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    password_hash = Column(String(300), nullable=True)
    password_plain = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    bookings = relationship("Booking", back_populates="staff")
    payment_notes = relationship("PaymentNote", foreign_keys="[PaymentNote.recorded_by]", back_populates="recorder")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    name_kh = Column(String(255), nullable=True)
    venue = Column(String(255), nullable=False)
    start_date = Column(String(50), nullable=False)
    end_date = Column(String(50), nullable=False)
    status = Column(String(50), default="active")  # "upcoming", "active", "completed"
    description = Column(Text, nullable=True)
    banner_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    canvas_width = Column(Integer, default=1600, nullable=False)
    canvas_height = Column(Integer, default=1000, nullable=False)
    layout_revision = Column(Integer, default=0, nullable=False)
    layout_elements = Column(Text, default="[]", nullable=False)
    categories = relationship("BoothCategory", back_populates="event", cascade="all, delete-orphan")
    booths = relationship("Booth", back_populates="event", cascade="all, delete-orphan")

class BoothCategory(Base):
    __tablename__ = "booth_categories"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    name_kh = Column(String(100), nullable=True)
    color_code = Column(String(50), default="#6366f1")
    base_price = Column(Float, nullable=False, default=1000.0)
    dimensions = Column(String(50), default="3m x 3m")
    power_supply = Column(String(100), default="5A / 220V")
    description = Column(Text, nullable=True)

    event = relationship("Event", back_populates="categories")
    booths = relationship("Booth", back_populates="category")

class Booth(Base):
    __tablename__ = "booths"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    category_id = Column(Integer, ForeignKey("booth_categories.id", ondelete="SET NULL"), nullable=True)
    booth_code = Column(String(50), nullable=False, index=True)
    zone = Column(String(50), default="Hall A")
    row_pos = Column(Integer, default=1)
    col_pos = Column(Integer, default=1)
    width_units = Column(Integer, default=1)  # 1 grid unit or 2
    height_units = Column(Integer, default=1)
    status = Column(String(50), default="available")  # available, hold, sold, blocked
    price = Column(Float, nullable=False, default=1200.0)
    has_3d_view = Column(Boolean, default=True)
    model_3d_url = Column(String(500), nullable=True)
    pos_x = Column(Integer, nullable=True)
    pos_y = Column(Integer, nullable=True)
    size_w = Column(Integer, default=120, nullable=False)
    size_h = Column(Integer, default=120, nullable=False)
    fascia_text = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    event = relationship("Event", back_populates="booths")
    category = relationship("BoothCategory", back_populates="booths")
    bookings = relationship("Booking", back_populates="booth", cascade="all, delete-orphan")
    handover = relationship("BoothHandover", back_populates="booth", uselist=False, cascade="all, delete-orphan")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booth_id = Column(Integer, ForeignKey("booths.id", ondelete="CASCADE"))
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    staff_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    exhibitor_name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=False)
    phone = Column(String(100), nullable=False)
    telegram = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    business_type = Column(String(150), nullable=True)
    fascia_name = Column(String(255), nullable=True)
    
    booking_status = Column(String(50), default="hold")  # hold, deposit_paid, fully_paid, cancelled
    hold_expires_at = Column(String(100), nullable=True)
    total_agreed_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    sales_notes = Column(Text, nullable=True)
    booth = relationship("Booth", back_populates="bookings")
    staff = relationship("User", back_populates="bookings")
    payment_notes = relationship("PaymentNote", back_populates="booking", cascade="all, delete-orphan")
    addons = relationship("BookingAddon", back_populates="booking", cascade="all, delete-orphan")
    badges = relationship("ExhibitorBadge", back_populates="booking", cascade="all, delete-orphan")
    handover = relationship("BoothHandover", back_populates="booking", uselist=False, cascade="all, delete-orphan")

class AddonService(Base):
    __tablename__ = "addon_services"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(150), nullable=False)
    name_kh = Column(String(150), nullable=True)
    category = Column(String(50), default="furniture")  # electrical, furniture, av, utilities, branding
    unit_price = Column(Float, nullable=False, default=10.0)
    unit_name = Column(String(50), default="unit")  # unit, pc, set, day
    icon = Column(String(50), default="Package")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class BookingAddon(Base):
    __tablename__ = "booking_addons"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Integer, ForeignKey("addon_services.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(150), nullable=False)
    name_kh = Column(String(150), nullable=True)
    category = Column(String(50), default="furniture")
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), default="delivered")  # pending, delivered
    created_at = Column(DateTime, default=utc_now)

    booking = relationship("Booking", back_populates="addons")

class ExhibitorBadge(Base):
    __tablename__ = "exhibitor_badges"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(150), nullable=False)
    position = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    badge_type = Column(String(50), default="exhibitor")  # exhibitor, contractor, vip
    qr_token = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    booking = relationship("Booking", back_populates="badges")

class BoothHandover(Base):
    __tablename__ = "booth_handovers"

    id = Column(Integer, primary_key=True, index=True)
    booth_id = Column(Integer, ForeignKey("booths.id", ondelete="CASCADE"), nullable=False, unique=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True)
    staff_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    recipient_name = Column(String(150), nullable=False)
    recipient_phone = Column(String(50), nullable=True)
    checklist_data = Column(Text, default="{}", nullable=False)  # JSON string of the 6 inspection criteria
    status = Column(String(50), default="passed")  # passed, issues_reported
    remarks = Column(Text, nullable=True)
    signoff_confirmed = Column(Boolean, default=True, nullable=False)
    checked_in_at = Column(DateTime, default=utc_now)

    booth = relationship("Booth", back_populates="handover")
    booking = relationship("Booking", back_populates="handover")
    staff = relationship("User")

class PaymentNote(Base):
    __tablename__ = "payment_notes"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"))
    recorded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    paid_amount = Column(Float, default=0.0)
    remaining_balance = Column(Float, default=0.0)
    payment_method = Column(String(100), default="Bank Transfer")  # ABA Transfer, Cash, Check, Wing
    reference_slip_no = Column(String(150), nullable=True)
    note_text = Column(Text, nullable=True)
    payment_date = Column(DateTime, default=utc_now)
    verification_status = Column(String(50), default="verified", nullable=False)  # verified, pending, rejected
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="payment_notes")
    recorder = relationship("User", foreign_keys=[recorded_by], back_populates="payment_notes")
    verifier = relationship("User", foreign_keys=[verified_by])

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    target = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=utc_now)

class LoginThrottle(Base):
    __tablename__ = "login_throttles"
    key = Column(String(64), primary_key=True)
    attempts = Column(Integer, default=0)
    window_start = Column(DateTime, default=utc_now)
