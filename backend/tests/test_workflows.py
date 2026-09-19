import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
TEMP = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(TEMP.name) / 'test.db')
from database import Base, engine, SessionLocal
import models
from main import app
from fastapi.testclient import TestClient
from auth import hash_password
TEST_PASSWORD = "Testing-Only-Password-2026!"
TEST_HASH = hash_password(TEST_PASSWORD)

class WorkflowTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            db.add(models.User(name='Test Admin',email='admin@test.local',role='admin',password_hash=TEST_HASH,is_active=True))
            db.commit()
        self.client = TestClient(app, client=('127.0.0.1',50000), headers={'X-Requested-With':'ExpoHub'})
        assert self.client.post('/api/auth/login',json={'email':'admin@test.local','password':TEST_PASSWORD}).status_code == 200
        self.event = self.client.post('/api/events', json={'name':'Test Expo','venue':'Test Hall','start_date':'2026-10-01','end_date':'2026-10-03'}).json()['event_id']
        response = self.client.post('/api/booths', json={'event_id':self.event,'booth_code':'D-01','price':100})
        self.assertEqual(response.status_code,201,response.text)
        self.booth = response.json()['booth_id']
    def book(self, **changes):
        payload = {'booth_id':self.booth,'event_id':self.event,'exhibitor_name':'Test Company','contact_person':'Test Person','phone':'012345678','total_agreed_price':100}
        payload.update(changes)
        return self.client.post(f'/api/booths/{self.booth}/book',json=payload)
    def test_hold_payment_balance_and_release_protection(self):
        booking = self.book().json()['booking_id']
        self.assertEqual(self.book().status_code,409)
        path = f'/api/bookings/{booking}/payment-note'
        self.assertEqual(self.client.post(path,json={'paid_amount':101}).status_code,400)
        self.assertEqual(self.client.post(path,json={'paid_amount':-10}).status_code,422)
        self.assertEqual(self.client.post(path,json={'paid_amount':40,'remaining_balance':0,'payment_date':'2026-09-08T00:00:00'}).status_code,200)
        booth = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertEqual(booth['active_booking']['remaining_due'],60)
        self.assertEqual(booth['active_booking']['booking_status'],'deposit_paid')
        self.assertTrue(booth['active_booking']['payment_notes'][0]['payment_date'].startswith('2026-09-08'))
        self.assertEqual(self.client.post(f'/api/booths/{self.booth}/release').status_code,409)
        self.assertEqual(self.client.post(path,json={'paid_amount':60}).status_code,200)
        self.assertEqual(self.client.post(path,json={'paid_amount':1}).status_code,400)
        data = self.client.get(f'/api/analytics/{self.event}').json()
        self.assertEqual(data['cash_collected'],100)
        self.assertEqual(data['receivables'],0)
        self.assertEqual(data['sold_count'],1)
        self.assertTrue(data['monthly_revenue'])
    def test_initial_payment_atomic_and_status(self):
        self.assertEqual(self.book(booking_status='fully_paid').status_code,400)
        self.assertEqual(self.book(initial_payment={'paid_amount':200}).status_code,400)
        with SessionLocal() as db:
            self.assertEqual(db.query(models.Booking).count(),0)
            self.assertEqual(db.get(models.Booth,self.booth).status,'available')
        self.assertEqual(self.book(booking_status='fully_paid',initial_payment={'paid_amount':100,'remaining_balance':500}).status_code,200)
        booth = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertEqual(booth['status'],'sold')
        self.assertEqual(booth['active_booking']['payment_notes'][0]['remaining_balance'],0)
    def test_release_and_rebook(self):
        old = self.book().json()['booking_id']
        self.assertEqual(self.client.post(f'/api/booths/{self.booth}/release').status_code,200)
        self.assertEqual(self.client.post(f'/api/bookings/{old}/payment-note',json={'paid_amount':10}).status_code,409)
        self.assertEqual(self.book().status_code,200)
        self.assertEqual(self.client.delete(f'/api/booths/{self.booth}').status_code,409)
        self.assertEqual(self.client.delete(f'/api/events/{self.event}').status_code,409)
    def test_edit_booth(self):
        path = f'/api/booths/{self.booth}'
        self.assertEqual(self.client.put(path,json={'booth_code':'D-02','price':150,'zone':'New Zone'}).status_code,200)
        booth = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertEqual((booth['booth_code'],booth['price'],booth['zone']),('D-02',150,'New Zone'))
        self.assertEqual(self.client.put(path,json={'booth_code':' '}).status_code,422)
        self.assertEqual(self.client.put(path,json={'row_pos':-1}).status_code,422)
        self.assertEqual(self.client.post('/api/booths',json={'event_id':self.event,'booth_code':'Negative','price':-1}).status_code,422)

    def test_validation(self):
        self.assertEqual(self.client.post('/api/booths',json={'event_id':self.event,'booth_code':'D-01'}).status_code,409)
        self.assertEqual(self.client.post('/api/booths',json={'event_id':999,'booth_code':'Z-01'}).status_code,404)
        self.assertEqual(self.client.post('/api/booths',json={'event_id':self.event,'booth_code':'Z-01','category_id':999}).status_code,400)
        self.assertEqual(self.book(event_id=999).status_code,400)
        self.assertEqual(self.book(exhibitor_name='   ').status_code,422)
        self.assertEqual(self.book(booking_status='other').status_code,422)
        self.assertEqual(self.client.post('/api/events',json={'name':'Bad','venue':'Hall','start_date':'2026-10-03','end_date':'2026-10-01'}).status_code,422)

def tearDownModule():
    engine.dispose()
    TEMP.cleanup()

if __name__ == "__main__":
    unittest.main()
