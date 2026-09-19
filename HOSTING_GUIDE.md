# ការណែនាំអំពីការរៀបចំ Hosting និង Database (ExpoHub Hosting Guide)

ឯកសារនេះណែនាំលម្អិតអំពីរបៀបរៀបចំ Hosting Database ជាមុន និងការដាក់ពង្រាយ Backend & Frontend ទៅកាន់ Production Server។

---

## ១. ការរៀបចំ Hosting Database ជាមុន (Hosting DB Setup)

លោកអ្នកអាចជ្រើសរើស Database Cloud Provider ណាមួយក៏បាន (ដូចជា Supabase, Neon, Railway, AWS RDS, DigitalOcean, ឬ Render)៖

### ជម្រើសដែលពេញនិយម និងឥតគិតថ្លៃ/តម្លៃសមរម្យបំផុត៖
1. **Supabase** (PostgreSQL): [https://supabase.com/](https://supabase.com/)
2. **Neon Serverless Postgres**: [https://neon.tech/](https://neon.tech/)
3. **Railway PostgreSQL**: [https://railway.app/](https://railway.app/)

### ជំហានភ្ជាប់ Database ទៅកាន់ Backend៖
1. បង្កើត Database Project ថ្មីនៅលើ Cloud Provider របស់អ្នក (ឧ. Supabase ឬ Neon)។
2. ចម្លងយក **Connection String (URI)** របស់ Database ឧទាហរណ៍៖
   ```env
   DATABASE_URL=postgresql://postgres.xxx:your_password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
3. បង្កើត File `.env` នៅក្នុងថត `backend/` រួចដាក់៖
   ```env
   DATABASE_URL=postgresql://username:password@your-host:5432/dbname
   COOKIE_SECURE=1
   ```
4. ប្រព័ន្ធនឹងបង្កើតតារាងទាំងអស់ (Auto-migration) ដោយស្វ័យប្រវត្តិនៅពេល Backend ចាប់ផ្តើមដំណើរការលើកដំបូង!

---

## ២. ការរៀបចំ Backend (FastAPI Python)

### កញ្ចប់តម្រូវការ (Dependencies)
```bash
cd backend
pip install -r requirements.txt
pip install psycopg2-binary
```

### ការ Run Backend នៅលើ Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```
*(ឬប្រើ Gunicorn / PM2 / Systemd Service សម្រាប់ Background Daemon)*

---

## ៣. ការរៀបចំ Frontend (Vite React)

### ការ Build Production Bundle
```bash
cd frontend
npm install
npm run build
```
បន្ទាប់ពី Build រួច ឯកសារ Production ទាំងអស់នឹងស្ថិតនៅក្នុងថត `frontend/dist/` ដែលលោកអ្នកអាច Deploy លើ Nginx, Cloudflare Pages, Vercel ឬ Netlify។

### Nginx Configuration គំរូ (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend Static Files
    location / {
        root /var/www/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ៤. ស្ថានភាព Database បច្ចុប្បន្ន (Clean Production Ready)
- **ទិន្នន័យ Mockup ទាំងអស់ត្រូវបានលុបចេញស្អាត ១០០%** (គ្មាន Booking, Payment, ឬ Event សាកល្បងឡើយ)។
- **កាតាឡុកសម្ភារៈស្តង់ដារ** (Add-on Services Catalog) ចំនួន ១០ មុខ ត្រូវបានរៀបចំទុកជាមុនស្វ័យប្រវត្តិ។
- ប្រព័ន្ធស្ថិតក្នុងស្ថានភាព **Initial Workspace Setup (`needs_setup: true`)** ដែលអនុញ្ញាតឱ្យលោកអ្នកបង្កើតគណនី Production Administrator ផ្លូវការលើកដំបូងដោយសុវត្ថិភាព។
