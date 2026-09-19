import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
TEMP = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + str(Path(TEMP.name) / 'test_addons.db')
from database import Base, engine, SessionLocal
import models
from main import app
from migrations import migrate
from fastapi.testclient import TestClient
from auth import hash_password

TEST_PASSWORD = "Testing-Only-Password-2026!"
TEST_HASH = hash_password(TEST_PASSWORD)

class AddonsAndHandoverTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        migrate()
        with SessionLocal() as db:
            db.add(models.User(name='Test Admin', email='admin@test.local', role='admin', password_hash=TEST_HASH, is_active=True))
            db.commit()
        self.client = TestClient(app, client=('127.0.0.1', 50000), headers={'X-Requested-With': 'ExpoHub'})
        res = self.client.post('/api/auth/login', json={'email': 'admin@test.local', 'password': TEST_PASSWORD})
        self.assertEqual(res.status_code, 200)

        # Create test event & booth
        self.event = self.client.post('/api/events', json={
            'name': 'Angkor Tech Expo',
            'venue': 'Koh Pich Hall A',
            'start_date': '2026-11-01',
            'end_date': '2026-11-03'
        }).json()['event_id']

        response = self.client.post('/api/booths', json={'event_id': self.event, 'booth_code': 'B-101', 'price': 500})
        self.assertEqual(response.status_code, 201)
        self.booth = response.json()['booth_id']

        # Book the booth
        book_res = self.client.post(f'/api/booths/{self.booth}/book', json={
            'booth_id': self.booth,
            'event_id': self.event,
            'exhibitor_name': 'CamTech Solutions',
            'contact_person': 'Sok Chan',
            'phone': '012999888',
            'fascia_name': 'CamTech Solutions Co., Ltd.',
            'total_agreed_price': 500
        })
        self.assertEqual(book_res.status_code, 200)
        self.booking_id = book_res.json()['booking_id']

    def tearDown(self):
        engine.dispose()

    def test_addons_catalog_and_ordering(self):
        # 1. Fetch catalog
        catalog = self.client.get(f'/api/events/{self.event}/addons').json()
        self.assertGreaterEqual(len(catalog), 5)
        spotlight = next(item for item in catalog if "Spotlight" in item["name"])
        self.assertEqual(spotlight["unit_price"], 15.0)

        # 2. Add an addon item to booking
        add_res = self.client.post(f'/api/bookings/{self.booking_id}/addons', json={
            'service_id': spotlight['id'],
            'name': spotlight['name'],
            'name_kh': spotlight['name_kh'],
            'category': spotlight['category'],
            'quantity': 2,
            'unit_price': 15.0
        })
        self.assertEqual(add_res.status_code, 201)
        addon_data = add_res.json()
        self.assertEqual(addon_data['total_price'], 30.0)

        # Verify agreed price increased
        booth_info = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertEqual(booth_info['active_booking']['total_agreed_price'], 530.0)
        self.assertEqual(len(booth_info['active_booking']['addons']), 1)

        # 3. Delete addon item
        del_res = self.client.delete(f'/api/bookings/{self.booking_id}/addons/{addon_data["id"]}')
        self.assertEqual(del_res.status_code, 200)

        booth_info2 = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertEqual(booth_info2['active_booking']['total_agreed_price'], 500.0)
        self.assertEqual(len(booth_info2['active_booking']['addons']), 0)

    def test_exhibitor_badges(self):
        # Create badge
        res = self.client.post(f'/api/bookings/{self.booking_id}/badges', json={
            'full_name': 'Khem Veasna',
            'position': 'Lead Architect',
            'phone': '011223344',
            'badge_type': 'exhibitor'
        })
        self.assertEqual(res.status_code, 201)
        badge = res.json()
        self.assertTrue(badge['qr_token'].startswith('EH-'))

        # Fetch badges
        badges = self.client.get(f'/api/bookings/{self.booking_id}/badges').json()
        self.assertEqual(len(badges), 1)
        self.assertEqual(badges[0]['full_name'], 'Khem Veasna')

    def test_movein_checkin_and_handover(self):
        # Before checkin
        initial = self.client.get(f'/api/booths/{self.booth}/handover').json()
        self.assertIsNone(initial)

        # Record check-in & handover
        checklist = '{"structure_ok":true,"fascia_name_ok":true,"carpet_ok":true,"power_sockets_ok":true,"furniture_delivered":true,"cleaning_done":true}'
        res = self.client.post(f'/api/booths/{self.booth}/handover', json={
            'recipient_name': 'Sok Chan',
            'recipient_phone': '012999888',
            'checklist_data': checklist,
            'status': 'passed',
            'remarks': 'All booth items delivered in perfect condition',
            'signoff_confirmed': True
        })
        self.assertEqual(res.status_code, 200)
        handover = res.json()
        self.assertEqual(handover['status'], 'passed')
        self.assertEqual(handover['staff_name'], 'Test Admin')

        # Verify booth serialization includes handover
        booth = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertIsNotNone(booth['handover'])
        self.assertEqual(booth['handover']['status'], 'passed')
        self.assertEqual(booth['handover']['recipient_name'], 'Sok Chan')

    def test_addons_and_badges_authorization_limits(self):
        # 1. Admin creates a separate staff user
        create_user_res = self.client.post('/api/users', json={
            'name': 'Other Sales Staff',
            'email': 'other_staff@test.local',
            'password': TEST_PASSWORD,
            'role': 'staff'
        })
        self.assertEqual(create_user_res.status_code, 201)

        # 2. Other staff signs in and updates temporary password
        staff_client = TestClient(app, client=('127.0.0.1', 50002), headers={'X-Requested-With': 'ExpoHub'})
        login_res = staff_client.post('/api/auth/login', json={'email': 'other_staff@test.local', 'password': TEST_PASSWORD})
        self.assertEqual(login_res.status_code, 200)
        staff_client.post('/api/auth/password', json={'current_password': TEST_PASSWORD, 'new_password': 'NewPassword12345!'})

        # 3. Other staff cannot add addon to another seller's booking (403 Forbidden)
        catalog = self.client.get(f'/api/events/{self.event}/addons').json()
        addon_item = catalog[0]
        unauth_addon_add = staff_client.post(f'/api/bookings/{self.booking_id}/addons', json={
            'service_id': addon_item['id'],
            'name': addon_item['name'],
            'name_kh': addon_item['name_kh'],
            'category': addon_item['category'],
            'quantity': 1,
            'unit_price': addon_item['unit_price']
        })
        self.assertEqual(unauth_addon_add.status_code, 403)

        # 4. Admin adds the addon
        admin_addon_res = self.client.post(f'/api/bookings/{self.booking_id}/addons', json={
            'service_id': addon_item['id'],
            'name': addon_item['name'],
            'name_kh': addon_item['name_kh'],
            'category': addon_item['category'],
            'quantity': 1,
            'unit_price': addon_item['unit_price']
        })
        self.assertEqual(admin_addon_res.status_code, 201)
        created_addon_id = admin_addon_res.json()['id']

        # 5. Other staff cannot delete addon from another seller's booking (403 Forbidden)
        unauth_addon_del = staff_client.delete(f'/api/bookings/{self.booking_id}/addons/{created_addon_id}')
        self.assertEqual(unauth_addon_del.status_code, 403)

        # 6. Other staff cannot create badge on another seller's booking (403 Forbidden)
        unauth_badge_add = staff_client.post(f'/api/bookings/{self.booking_id}/badges', json={
            'full_name': 'Unauthorized Attendant',
            'position': 'Staff',
            'phone': '012111222',
            'badge_type': 'exhibitor'
        })
        self.assertEqual(unauth_badge_add.status_code, 403)

        # 7. Admin creates a badge
        admin_badge_res = self.client.post(f'/api/bookings/{self.booking_id}/badges', json={
            'full_name': 'Authorized Attendant',
            'position': 'Manager',
            'phone': '012333444',
            'badge_type': 'exhibitor'
        })
        self.assertEqual(admin_badge_res.status_code, 201)
        created_badge_id = admin_badge_res.json()['id']

        # 8. Other staff cannot delete badge from another seller's booking (403 Forbidden)
        unauth_badge_del = staff_client.delete(f'/api/bookings/{self.booking_id}/badges/{created_badge_id}')
        self.assertEqual(unauth_badge_del.status_code, 403)

        # 9. Non-admin staff cannot release expired holds event-wide (403 Forbidden)
        unauth_release_expired = staff_client.post(f'/api/events/{self.event}/release-expired-holds')
        self.assertEqual(unauth_release_expired.status_code, 403)

        # 10. Admin can release expired holds (200 OK)
        admin_release_expired = self.client.post(f'/api/events/{self.event}/release-expired-holds')
        self.assertEqual(admin_release_expired.status_code, 200)

if __name__ == '__main__':
    unittest.main()
