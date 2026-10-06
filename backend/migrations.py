"""Additive migration: legacy booth locations remain unplaced until an admin saves a plan."""
from sqlalchemy import inspect, text
from database import Base, engine
import models

def migrate():
    Base.metadata.create_all(engine)
    additions = {
        'users': {'password_hash':'VARCHAR(300)', 'password_plain':'VARCHAR(255)', 'is_active':'BOOLEAN NOT NULL DEFAULT true', 'must_change_password':'BOOLEAN NOT NULL DEFAULT false'},
        'events': {'canvas_width':'INTEGER NOT NULL DEFAULT 1600','canvas_height':'INTEGER NOT NULL DEFAULT 1000','layout_revision':'INTEGER NOT NULL DEFAULT 0','layout_elements':"TEXT NOT NULL DEFAULT '[]'"},
        'booths': {'pos_x':'INTEGER','pos_y':'INTEGER','size_w':'INTEGER NOT NULL DEFAULT 120','size_h':'INTEGER NOT NULL DEFAULT 120'},
        'bookings': {'sales_notes':'TEXT'},
        'payment_notes': {
            'verification_status': "VARCHAR(50) NOT NULL DEFAULT 'verified'",
            'verified_by': 'INTEGER',
            'verified_at': 'TIMESTAMP'
        },
    }
    with engine.begin() as connection:
        for table, fields in additions.items():
            present = {c['name'] for c in inspect(connection).get_columns(table)}
            for name, declaration in fields.items():
                if name not in present:
                    connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {declaration}'))

        # Add indexes on foreign keys and frequently queried fields if not exists
        indexes = [
            ("ix_booth_categories_event_id", "booth_categories", "event_id"),
            ("ix_booths_event_id", "booths", "event_id"),
            ("ix_booths_category_id", "booths", "category_id"),
            ("ix_booths_status", "booths", "status"),
            ("ix_bookings_booth_id", "bookings", "booth_id"),
            ("ix_bookings_event_id", "bookings", "event_id"),
            ("ix_bookings_staff_id", "bookings", "staff_id"),
            ("ix_bookings_booking_status", "bookings", "booking_status"),
            ("ix_addon_services_event_id", "addon_services", "event_id"),
            ("ix_addon_services_is_active", "addon_services", "is_active"),
            ("ix_booking_addons_booking_id", "booking_addons", "booking_id"),
            ("ix_booking_addons_service_id", "booking_addons", "service_id"),
            ("ix_exhibitor_badges_booking_id", "exhibitor_badges", "booking_id"),
            ("ix_booth_handovers_booking_id", "booth_handovers", "booking_id"),
            ("ix_booth_handovers_staff_id", "booth_handovers", "staff_id"),
            ("ix_payment_notes_booking_id", "payment_notes", "booking_id"),
            ("ix_payment_notes_recorded_by", "payment_notes", "recorded_by"),
            ("ix_payment_notes_verification_status", "payment_notes", "verification_status"),
            ("ix_payment_notes_verified_by", "payment_notes", "verified_by"),
            ("ix_auth_sessions_user_id", "auth_sessions", "user_id"),
            ("ix_auth_sessions_expires_at", "auth_sessions", "expires_at"),
            ("ix_audit_logs_user_id", "audit_logs", "user_id"),
            ("ix_audit_logs_action", "audit_logs", "action"),
            ("ix_audit_logs_created_at", "audit_logs", "created_at"),
        ]
        for idx_name, table, column in indexes:
            try:
                connection.execute(text(f'CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})'))
            except Exception:
                pass

        # Seed initial default Addon Services if none exist
        existing_addons = connection.execute(text("SELECT count(*) FROM addon_services")).scalar()
        if existing_addons == 0:
            default_items = [
                ("Spotlight 100W", "អំពូលភ្លើង Spotlight 100W", "electrical", 15.0, "pc", "Zap"),
                ("Extra Power Socket 5A / 220V", "រន្ធដោតភ្លើង 5A / 220V បន្ថែម", "electrical", 25.0, "set", "Plug"),
                ("Heavy Power Upgrade 15A 3-Phase", "កម្លាំងភ្លើង 15A 3-Phase សម្រាប់ម៉ាស៊ីន", "electrical", 120.0, "set", "BatteryCharging"),
                ("Standard Office Table 1.2m", "តុការិយាល័យ 1.2m ក្រាលកម្រាល", "furniture", 20.0, "pc", "Square"),
                ("VIP Leather Armchair", "កៅអីពូក VIP", "furniture", 15.0, "pc", "Armchair"),
                ("Standard Folding Chair", "កៅអីបត់ស្តង់ដារ", "furniture", 5.0, "pc", "Chair"),
                ("Brochure Display Rack", "ធ្នើរដាក់ខិត្តប័ណ្ណពាណិជ្ជកម្ម", "furniture", 18.0, "set", "BookOpen"),
                ("43\" Smart TV with Floor Stand", "ទូរទស្សន៍ 43 អ៊ីញ ជាមួយជើងទម្រ", "av", 85.0, "set", "Tv"),
                ("Waste Bin & Daily Cleaning", "ធុងសំរាម និងសេវាបោសសម្អាតប្រចាំថ្ងៃ", "utilities", 10.0, "set", "Trash2"),
                ("Fascia Name Graphic Sticker", "ស្ទីកឃ័របិទផ្លាកឈ្មោះ ឬជញ្ជាំងស្តង់", "branding", 45.0, "set", "Image")
            ]
            for name, name_kh, cat, price, unit, icon in default_items:
                connection.execute(
                    text("INSERT INTO addon_services (name, name_kh, category, unit_price, unit_name, icon, is_active) VALUES (:name, :name_kh, :category, :unit_price, :unit_name, :icon, true)"),
                    {"name": name, "name_kh": name_kh, "category": cat, "unit_price": price, "unit_name": unit, "icon": icon}
                )
