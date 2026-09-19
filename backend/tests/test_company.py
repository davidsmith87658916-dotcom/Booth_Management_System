import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import text
import test_workflows as base
from database import Base, engine, SessionLocal
from main import app
from migrations import migrate
import models

class CompanyWorkflowTests(unittest.TestCase):
    setUp=base.WorkflowTests.setUp
    book=base.WorkflowTests.book

    def staff_client(self,email='staff@test.local',role='staff'):
        with SessionLocal() as db:
            user = db.query(models.User).filter_by(email=email).first()
            if not user:
                db.add(models.User(name=email.split('@')[0],email=email,role=role,password_hash=base.TEST_HASH,is_active=True));db.commit()
            elif user.role != role:
                user.role = role
                db.commit()
        c=TestClient(app,client=('127.0.0.1',51000),headers={'X-Requested-With':'ExpoHub'})
        self.assertEqual(c.post('/api/auth/login',json={'email':email,'password':base.TEST_PASSWORD}).status_code,200)
        return c

    def test_anonymous_reads_and_writes_are_blocked(self):
        anon=TestClient(app,headers={'X-Requested-With':'ExpoHub'})
        for path in ['/api/events','/api/users',f'/api/events/{self.event}/booths',f'/api/events/{self.event}/categories',f'/api/events/{self.event}/layout',f'/api/analytics/{self.event}','/api/audit']:
            self.assertEqual(anon.get(path).status_code,401,path)
        self.assertEqual(anon.post(f'/api/booths/{self.booth}/release').status_code,401)
        self.assertEqual(anon.get('/api/auth/status').status_code,200)

    def test_staff_cannot_modify_admin_resources(self):
        staff=self.staff_client()
        for method,path,payload in [
            ('get','/api/users',None),('get','/api/audit',None),
            ('post','/api/users',{'name':'X','email':'x@test.local','password':base.TEST_PASSWORD}),
            ('post','/api/events',{'name':'X','venue':'Y','start_date':'2026-01-01','end_date':'2026-01-02'}),
            ('post','/api/booths',{'event_id':self.event,'booth_code':'X'}),
            ('put',f'/api/booths/{self.booth}',{'price':1}),
            ('delete',f'/api/booths/{self.booth}',None),
            ('delete',f'/api/events/{self.event}',None),
            ('put',f'/api/events/{self.event}/layout',{'revision':0,'width':800,'height':600,'placements':[]})]:
            result=getattr(staff,method)(path,**({'json':payload} if payload else {}))
            self.assertEqual(result.status_code,403,(method,path,result.text))

    def test_user_creation_first_password_change_logout(self):
        result=self.client.post('/api/users',json={'name':'Employee','email':'employee@test.local','password':base.TEST_PASSWORD,'role':'staff'})
        self.assertEqual(result.status_code,201,result.text)
        self.assertNotIn('password_hash',result.json())
        staff=self.staff_client('employee@test.local')
        # Staff is not blocked by password change and can immediately access events
        self.assertEqual(staff.get('/api/events').status_code,200)
        self.assertFalse(staff.get('/api/auth/me').json()['must_change_password'])
        # Staff is forbidden from changing passwords
        self.assertEqual(staff.post('/api/auth/password',json={'current_password':base.TEST_PASSWORD,'new_password':'New-Temporary-Test-2026'}).status_code,403)
        # Administrator can change their own password
        self.assertEqual(self.client.post('/api/auth/password',json={'current_password':base.TEST_PASSWORD,'new_password':'Admin-New-Pass-2026'}).status_code,200)
        cookie=staff.cookies.get('expohub_session');self.assertTrue(cookie)
        self.assertEqual(staff.post('/api/auth/logout').status_code,200)
        self.assertEqual(staff.get('/api/auth/me').status_code,401)

    def test_reset_disable_and_protect_own_admin(self):
        staff=self.staff_client()
        u=staff.get('/api/auth/me').json()
        self.assertEqual(self.client.post(f'/api/users/{u["id"]}/password',json={'password':'Changed-Temporary-2026'}).status_code,200)
        self.assertEqual(staff.get('/api/events').status_code,401)
        self.assertEqual(self.client.put(f'/api/users/{u["id"]}',json={'name':u['name'],'role':'staff','is_active':False}).status_code,200)
        self.assertEqual(staff.post('/api/auth/login',json={'email':u['email'],'password':'Changed-Temporary-2026'}).status_code,401)
        admin=self.client.get('/api/auth/me').json()
        self.assertEqual(self.client.put(f'/api/users/{admin["id"]}',json={'name':'Admin','role':'staff','is_active':True}).status_code,409)
        self.assertEqual(self.client.post('/api/users',json={'name':'Dup','email':'ADMIN@test.local','password':base.TEST_PASSWORD}).status_code,409)

    def test_staff_sale_without_payment_and_attribution(self):
        staff=self.staff_client(); original=self.client; self.client=staff
        result=self.book(booking_status='confirmed',staff_id=999,sales_notes='Customer asked for corner branding')
        self.client=original
        self.assertEqual(result.status_code,200,result.text)
        booth=self.client.get(f'/api/events/{self.event}/booths').json()[0]
        user=staff.get('/api/auth/me').json()
        self.assertEqual(booth['status'],'sold')
        self.assertEqual(booth['active_booking']['staff_id'],user['id'])
        self.assertEqual(booth['active_booking']['staff_name'],user['name'])
        self.assertEqual(booth['active_booking']['sales_notes'],'Customer asked for corner branding')
        self.assertEqual(booth['active_booking']['remaining_due'],100)
        other=self.staff_client('other@test.local')
        self.assertEqual(other.get(f'/api/events/{self.event}/booths').json()[0]['status'],'sold')
        self.assertEqual(other.post(f'/api/bookings/{result.json()["booking_id"]}/payment-note',json={'paid_amount':50}).status_code,403)
        board=self.client.get(f'/api/analytics/{self.event}').json()
        self.assertEqual(board['sold_count'],1)
        self.assertEqual(board['leaderboard'][0]['booths_sold'],1)
        audit=self.client.get('/api/audit').json()
        self.assertTrue(any(a['actor']==user['name'] and a['action']=='booking.created' for a in audit))

    def test_owner_hold_confirmation_and_release_permissions(self):
        staff=self.staff_client();original=self.client;self.client=staff
        booking=self.book().json()['booking_id'];self.client=original
        other=self.staff_client('other@test.local')
        self.assertEqual(other.post(f'/api/booths/{self.booth}/release').status_code,403)
        self.assertEqual(other.post(f'/api/bookings/{booking}/confirm').status_code,403)
        self.assertEqual(staff.post(f'/api/bookings/{booking}/confirm').status_code,200)
        self.assertEqual(staff.post(f'/api/bookings/{booking}/confirm').status_code,409)
        self.assertEqual(staff.get(f'/api/events/{self.event}/booths').json()[0]['status'],'sold')

    def test_blank_layout_save_resize_and_reload(self):
        path=f'/api/events/{self.event}/layout'
        plan=self.client.get(path).json()
        self.assertIsNone(plan['placements'][0]['x'])
        self.assertEqual(plan['elements'],[])
        plan.update(width=1200,height=800);plan['placements'][0].update(x=200,y=300,w=240,h=120)
        plan['elements']=[{'id':'venue-entrance-1','type':'entrance','label':'Main Entrance','x':20,'y':700,'w':220,'h':70,'rotation':0}]
        saved=self.client.put(path,json=plan)
        self.assertEqual(saved.status_code,200,saved.text)
        self.assertEqual(saved.json()['revision'],plan['revision']+1)
        again=self.staff_client().get(path).json()
        self.assertEqual(again['placements'][0],{'id':self.booth,'x':200,'y':300,'w':240,'h':120})
        self.assertEqual(again['elements'],plan['elements'])
        self.assertEqual((again['width'],again['height']),(1200,800))
        booth=self.client.get(f'/api/events/{self.event}/booths').json()[0]
        self.assertEqual(booth['dimensions'],'6m x 3m (18 m²)')
        self.assertEqual(self.client.put(path,json=plan).status_code,409)

    def test_venue_element_validation(self):
        path=f'/api/events/{self.event}/layout'
        plan=self.client.get(path).json()
        plan['elements']=[{'id':'venue-stage-1','type':'stage','label':'Main Stage','x':1400,'y':100,'w':360,'h':180,'rotation':0}]
        self.assertEqual(self.client.put(path,json=plan).status_code,422)
        plan['elements'][0].update(x=100,type='unknown')
        self.assertEqual(self.client.put(path,json=plan).status_code,422)
        plan['elements']=[{'id':'venue-stage-1','type':'stage','label':'Main Stage','x':100,'y':100,'w':360,'h':180,'rotation':45}]
        self.assertEqual(self.client.put(path,json=plan).status_code,422)

    def test_overlap_outside_and_inventory_changes(self):
        path=f'/api/events/{self.event}/layout'
        old=self.client.get(path).json()
        self.client.post('/api/booths',json={'event_id':self.event,'booth_code':'B-02'})
        self.assertEqual(self.client.put(path,json=old).status_code,409)
        plan=self.client.get(path).json()
        for p in plan['placements']:p.update(x=100,y=100)
        self.assertEqual(self.client.put(path,json=plan).status_code,422)
        self.assertEqual(self.client.get(path).json()['revision'],plan['revision'])
        plan['placements'][1].update(x=400,y=100);plan['placements'][0]['x']=plan['width']
        self.assertEqual(self.client.put(path,json=plan).status_code,422)
        plan['placements'][0].update(x=None,y=100)
        self.assertEqual(self.client.put(path,json=plan).status_code,422)

    def test_concurrent_staff_sales_only_one_wins(self):
        clients=[self.staff_client('one@test.local'),self.staff_client('two@test.local')]; barrier=Barrier(2)
        payload={'booth_id':self.booth,'event_id':self.event,'exhibitor_name':'Concurrent','contact_person':'Customer','phone':'123456','total_agreed_price':100,'booking_status':'confirmed'}
        def book(c):barrier.wait();return c.post(f'/api/booths/{self.booth}/book',json=payload).status_code
        with ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(book,clients))
        self.assertEqual(sorted(results),[200,409])
        with SessionLocal() as db:self.assertEqual(db.query(models.Booking).count(),1)

    def test_concurrent_payments_never_overpay(self):
        booking=self.book().json()['booking_id'];barrier=Barrier(2)
        clients=[TestClient(app,headers={'X-Requested-With':'ExpoHub'}) for _ in range(2)]
        for c in clients:c.cookies.update(self.client.cookies)
        def pay(c):barrier.wait();return c.post(f'/api/bookings/{booking}/payment-note',json={'paid_amount':60}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(pay,clients))
        self.assertEqual(sorted(results),[200,400])
        b=self.client.get(f'/api/events/{self.event}/booths').json()[0]['active_booking']
        self.assertEqual(b['total_paid'],60);self.assertEqual(b['remaining_due'],40)

    def test_fractional_cent_payment_is_rejected(self):
        booking=self.book().json()['booking_id']
        self.assertEqual(self.client.post(f'/api/bookings/{booking}/payment-note',json={'paid_amount':0.001}).status_code,422)
        self.assertEqual(self.client.post(f'/api/bookings/{booking}/payment-note',json={'paid_amount':0.01}).status_code,200)

    def test_csrf_session_expiry_and_login_throttle(self):
        self.assertEqual(TestClient(app).post('/api/auth/logout').status_code,403)
        with SessionLocal() as db:
            db.query(models.AuthSession).update({'expires_at':datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(seconds=1)});db.commit()
        self.assertEqual(self.client.get('/api/events').status_code,401)
        for _ in range(10): self.client.post('/api/auth/login',json={'email':'nobody@test.local','password':'wrong'})
        self.assertEqual(self.client.post('/api/auth/login',json={'email':'nobody@test.local','password':'wrong'}).status_code,429)

    def test_event_update_validation_and_delete_empty(self):
        payload={'name':'Updated','venue':'New','start_date':'2026-02-02','end_date':'2026-01-01'}
        self.assertEqual(self.client.put(f'/api/events/{self.event}',json=payload).status_code,422)
        payload['end_date']='2026-02-03'
        self.assertEqual(self.client.put(f'/api/events/{self.event}',json=payload).status_code,200)
        self.assertEqual(self.client.delete(f'/api/booths/{self.booth}').status_code,200)
        self.assertEqual(self.client.delete(f'/api/events/{self.event}').status_code,200)
        self.assertEqual(self.client.get(f'/api/events/{self.event}/booths').status_code,404)

    def test_additive_migration_and_initial_setup(self):
        Base.metadata.drop_all(engine)
        with engine.begin() as connection:
            connection.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(100) NOT NULL,role VARCHAR(20),phone VARCHAR(50),created_at DATETIME)'))
            connection.execute(text("INSERT INTO users(id,name,email,role) VALUES(1,'Legacy','legacy@test.local','admin')"))
        migrate();migrate()
        with SessionLocal() as db:self.assertEqual(db.get(models.User,1).name,'Legacy')
        remote=TestClient(app,client=('10.0.0.25',52001),headers={'X-Requested-With':'ExpoHub'})
        payload={'name':'Owner','email':'legacy@test.local','password':base.TEST_PASSWORD}
        self.assertEqual(remote.post('/api/auth/setup',json=payload).status_code,403)
        setup=TestClient(app,client=('127.0.0.1',52000),headers={'X-Requested-With':'ExpoHub'})
        self.assertTrue(setup.get('/api/auth/status').json()['needs_setup'])
        self.assertEqual(setup.post('/api/auth/setup',json=payload).status_code,200)
        self.assertEqual(setup.post('/api/auth/setup',json=payload).status_code,409)
        self.assertEqual(setup.get('/api/auth/me').json()['role'],'admin')

    def test_accountant_role_and_payment_verification(self):
        # 1. Admin creates an accountant user
        acc_resp = self.client.post('/api/users', json={
            'name': 'Finance Officer',
            'email': 'finance@test.local',
            'password': base.TEST_PASSWORD,
            'role': 'accountant'
        })
        self.assertEqual(acc_resp.status_code, 201)
        
        # 2. Staff books booth with initial payment
        staff = self.staff_client('sales_rep@test.local')
        orig_client = self.client
        self.client = staff
        book_res = self.book(initial_payment={'paid_amount': 40, 'payment_method': 'Bank Transfer', 'reference_slip_no': 'SLIP-9988'})
        self.client = orig_client
        self.assertEqual(book_res.status_code, 200)
        
        # Check that staff recorded payment has status 'pending'
        booths = self.client.get(f'/api/events/{self.event}/booths').json()
        note = booths[0]['active_booking']['payment_notes'][0]
        self.assertEqual(note['verification_status'], 'pending')
        note_id = note['id']
        
        # 3. Staff cannot verify payment (403)
        self.assertEqual(staff.post(f'/api/payment-notes/{note_id}/verify').status_code, 403)
        
        # 4. Accountant logs in and verifies payment
        acc_client = self.staff_client('finance@test.local', role='accountant')
        verify_res = acc_client.post(f'/api/payment-notes/{note_id}/verify')
        self.assertEqual(verify_res.status_code, 200)
        
        # Check verified status
        booths_after = self.client.get(f'/api/events/{self.event}/booths').json()
        verified_note = booths_after[0]['active_booking']['payment_notes'][0]
        self.assertEqual(verified_note['verification_status'], 'verified')
        self.assertIsNotNone(verified_note['verified_by'])
        
        # 5. Test public floorplan endpoint without credentials
        anon = TestClient(app)
        pub_res = anon.get(f'/api/public/events/{self.event}/floorplan')
        self.assertEqual(pub_res.status_code, 200)
        self.assertEqual(len(pub_res.json()['booths']), 1)

    def test_manager_permissions_and_boundaries(self):
        # 1. Admin creates Manager
        res = self.client.post('/api/users', json={'name':'Manager John','email':'manager@test.local','password':base.TEST_PASSWORD,'role':'manager'})
        self.assertEqual(res.status_code, 201)
        
        manager = self.staff_client('manager@test.local', role='manager')
        
        # 2. Manager CANNOT access admin endpoints (users, audit, event deletion, booth creation, password change)
        for method,path,payload in [
            ('get','/api/users',None),
            ('get','/api/audit',None),
            ('post','/api/users',{'name':'Sub','email':'sub@test.local','password':base.TEST_PASSWORD,'role':'staff'}),
            ('post','/api/events',{'name':'Event2','venue':'V','start_date':'2026-01-01','end_date':'2026-01-02'}),
            ('delete',f'/api/events/{self.event}',None),
            ('post','/api/booths',{'event_id':self.event,'booth_code':'M-01'}),
            ('delete',f'/api/booths/{self.booth}',None),
            ('post','/api/auth/password',{'current_password':base.TEST_PASSWORD,'new_password':'Manager-Pass'}),
        ]:
            result = getattr(manager, method)(path, **({'json': payload} if payload else {}))
            self.assertEqual(result.status_code, 403, (method, path, result.text))
        
        # 3. Manager CANNOT verify or reject payment notes (strictly finance/admin)
        note_res = self.client.post(f'/api/bookings/{self.book().json()["booking_id"]}/payment-note', json={'paid_amount':10})
        booth_data = self.client.get(f'/api/events/{self.event}/booths').json()[0]
        note_id = booth_data['active_booking']['payment_notes'][0]['id']
        self.assertEqual(manager.post(f'/api/payment-notes/{note_id}/verify').status_code, 403)
        self.assertEqual(manager.post(f'/api/payment-notes/{note_id}/reject').status_code, 403)

        # 4. Manager CAN access analytics
        self.assertEqual(manager.get(f'/api/analytics/{self.event}').status_code, 200)
        
        # 5. Manager CAN manage/override staff booking (extend hold, confirm sale)
        create_res = self.client.post('/api/booths', json={'event_id':self.event, 'booth_code':'M-99', 'price':100})
        booth2 = create_res.json()['booth_id']
        staff = self.staff_client('seller@test.local', role='staff')
        bk_res = staff.post(f'/api/booths/{booth2}/book', json={
            'booth_id': booth2,
            'event_id': self.event,
            'exhibitor_name': 'Staff Client Corp',
            'contact_person': 'Staff',
            'phone': '012345678',
            'booking_status': 'hold',
            'total_agreed_price': 100
        }).json()
        booking2 = bk_res['booking_id']
        
        # Manager extends hold and confirms sale on staff's booking
        self.assertEqual(manager.post(f'/api/bookings/{booking2}/extend-hold', json={'hours': 48}).status_code, 200)
        self.assertEqual(manager.post(f'/api/bookings/{booking2}/confirm').status_code, 200)

    def test_admin_password_reveal_and_user_deletion(self):
        # 1. Admin creates a user with known password
        test_pass = 'SecretPass@2026'
        create_res = self.client.post('/api/users', json={'name':'Delete Me','email':'deleteme@test.local','password':test_pass,'role':'staff'})
        self.assertEqual(create_res.status_code, 201)
        created_user = create_res.json()
        user_id = created_user['id']
        
        # Admin can view password_plain
        self.assertEqual(created_user.get('password_plain'), test_pass)
        
        # When Admin fetches all users, password_plain is included
        users_list = self.client.get('/api/users').json()
        target_in_list = [u for u in users_list if u['id'] == user_id][0]
        self.assertEqual(target_in_list.get('password_plain'), test_pass)
        
        # When staff logs in and gets /api/auth/me, password_plain is NOT exposed
        staff = TestClient(app, client=('127.0.0.1', 51000), headers={'X-Requested-With': 'ExpoHub'})
        self.assertEqual(staff.post('/api/auth/login', json={'email': 'deleteme@test.local', 'password': test_pass}).status_code, 200)
        me = staff.get('/api/auth/me').json()
        self.assertNotIn('password_plain', me)
        
        # Staff cannot delete any user (403)
        self.assertEqual(staff.delete(f'/api/users/{user_id}').status_code, 403)
        
        # Admin cannot delete their own account (400)
        admin_me = self.client.get('/api/auth/me').json()
        self.assertEqual(self.client.delete(f'/api/users/{admin_me["id"]}').status_code, 400)
        
        # Admin resets password -> password_plain is updated
        new_pass = 'ResetSecret@2026'
        reset_res = self.client.post(f'/api/users/{user_id}/password', json={'password': new_pass})
        self.assertEqual(reset_res.status_code, 200)
        self.assertEqual(reset_res.json().get('password_plain'), new_pass)
        
        # Verify user can login with new pass
        staff2 = TestClient(app, client=('127.0.0.1',51000), headers={'X-Requested-With':'ExpoHub'})
        self.assertEqual(staff2.post('/api/auth/login', json={'email':'deleteme@test.local','password':new_pass}).status_code, 200)
        
        # Admin deletes the user
        del_res = self.client.delete(f'/api/users/{user_id}')
        self.assertEqual(del_res.status_code, 200)
        
        # User is deleted from user list
        users_after = self.client.get('/api/users').json()
        self.assertNotIn(user_id, [u['id'] for u in users_after])
        
        # User cannot login anymore
        self.assertEqual(staff2.post('/api/auth/login', json={'email':'deleteme@test.local','password':new_pass}).status_code, 401)

if __name__=='__main__':unittest.main()
