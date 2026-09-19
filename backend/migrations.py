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
