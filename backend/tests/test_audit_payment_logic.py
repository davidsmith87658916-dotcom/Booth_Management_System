import unittest
from datetime import datetime, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db
from main import app
from auth import hash_password

class TestPaymentLogicAudit(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app, client=('127.0.0.1', 50000), headers={'X-Requested-With': 'ExpoHub'})

        # Seed admin and accountant
        with self.Session() as db:
            admin = models.User(name="Admin User", email="admin@test.local", role="admin", password_hash=hash_password("Admin12345678!"), is_active=True)
            accountant = models.User(name="Accountant", email="acct@test.local", role="accountant", password_hash=hash_password("Admin12345678!"), is_active=True)
            db.add_all([admin, accountant])
            db.commit()

            event = models.Event(name="Expo 2026", venue="Diamond Island, Phnom Penh", start_date="2026-10-01", end_date="2026-10-05", status="active")
            db.add(event)
            db.commit()

            cat = models.BoothCategory(event_id=event.id, name="Standard", base_price=1000.0)
            db.add(cat)
            db.commit()

            booth = models.Booth(event_id=event.id, category_id=cat.id, booth_code="P-01", price=1000.0, status="available")
            db.add(booth)
            db.commit()

            self.event_id = event.id
            self.booth_id = booth.id

        # Login as admin
        res = self.client.post("/api/auth/login", json={"email": "admin@test.local", "password": "Admin12345678!"})
        self.assertEqual(res.status_code, 200)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_payment_rejection_recalculates_status_and_balance(self):
        # 1. Book booth with $400 initial deposit
        book_res = self.client.post(f"/api/booths/{self.booth_id}/book", json={
            "booth_id": self.booth_id,
            "event_id": self.event_id,
            "exhibitor_name": "Tech Corp",
            "contact_person": "John",
            "phone": "012345678",
            "booking_status": "deposit_paid",
            "total_agreed_price": 1000.0,
            "initial_payment": {
                "paid_amount": 400.0,
                "payment_method": "ABA Bank",
                "reference_slip_no": "SLIP-001"
            }
        })
        self.assertEqual(book_res.status_code, 200)
        booking_id = book_res.json()["booking_id"]

        # Check booth and booking status
        booths = self.client.get(f"/api/events/{self.event_id}/booths").json()
        b = next(x for x in booths if x["id"] == self.booth_id)
        self.assertEqual(b["status"], "sold")
        self.assertEqual(b["active_booking"]["total_paid"], 400.0)
        self.assertEqual(b["active_booking"]["remaining_due"], 600.0)
        self.assertEqual(b["active_booking"]["booking_status"], "deposit_paid")
        pn_id = b["active_booking"]["payment_notes"][0]["id"]

        # 2. Reject the payment note as accountant/finance
        reject_res = self.client.post(f"/api/payment-notes/{pn_id}/reject")
        self.assertEqual(reject_res.status_code, 200)

        # 3. Verify total_paid and remaining_due updated (rejected payment not counted)
        booths_after = self.client.get(f"/api/events/{self.event_id}/booths").json()
        b_after = next(x for x in booths_after if x["id"] == self.booth_id)
        self.assertEqual(b_after["active_booking"]["total_paid"], 0.0)
        self.assertEqual(b_after["active_booking"]["remaining_due"], 1000.0)
        self.assertEqual(b_after["active_booking"]["booking_status"], "confirmed")

        # 4. Record new valid replacement payment of $1000
        pay_res = self.client.post(f"/api/bookings/{booking_id}/payment-note", json={
            "paid_amount": 1000.0,
            "payment_method": "Cash",
            "reference_slip_no": "CASH-CORRECT"
        })
        self.assertEqual(pay_res.status_code, 200)

        # 5. Check analytics does not count the rejected $400, only counts the valid $1000
        analytics = self.client.get(f"/api/analytics/{self.event_id}").json()
        self.assertEqual(analytics["cash_collected"], 1000.0)
        self.assertEqual(analytics["contracted_revenue"], 1000.0)
        self.assertEqual(analytics["receivables"], 0.0)

if __name__ == "__main__":
    unittest.main()
