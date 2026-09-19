# មគ្គុទ្ទេសក៍ដាក់ពង្រាយប្រព័ន្ធ ExpoHub ទៅកាន់ Render (Backend) និង Vercel (Frontend)
# Complete Deployment Guide: Render (Backend) & Vercel (Frontend)

ឯកសារនេះណែនាំលម្អិតគ្រប់ជំហាន (Step-by-Step) ក្នុងការដាក់ដំណើរការប្រព័ន្ធគ្រប់គ្រងស្តង់ពិព័រណ៍ **ExpoHub** នៅលើ Cloud Services ទាំងពីរ៖
- **Backend & Database**: ដាក់ដំណើរការលើ **Render** ([render.com](https://render.com)) ដោយឥតគិតថ្លៃ (Free Tier)
- **Frontend**: ដាក់ដំណើរការលើ **Vercel** ([vercel.com](https://vercel.com)) ដោយឥតគិតថ្លៃ (Free Tier)

---

## ទិដ្ឋភាពទូទៅនៃស្ថាបត្យកម្ម (Architecture Overview)

```
┌────────────────────────────────┐         HTTPS Cross-Origin API         ┌─────────────────────────────────┐
│        Vercel (Frontend)       │ ─────────────────────────────────────> │         Render (Backend)        │
│  - React (Vite)                │ <───────────────────────────────────── │  - FastAPI (Python 3.12)        │
│  - URL: https://app.vercel.app │      HttpOnly Cookie (SameSite=None)   │  - URL: https://api.onrender.com│
└────────────────────────────────┘                                        └────────────────┬────────────────┘
                                                                                           │ Internal Network
                                                                                           ▼
                                                                          ┌─────────────────────────────────┐
                                                                          │      Render PostgreSQL DB       │
                                                                          │  - Auto migrations on startup   │
                                                                          └─────────────────────────────────┘
```

---

## ជំហានទី ១៖ រុញកូដទៅកាន់ GitHub (Push to GitHub)

ដើម្បី Deploy ទៅកាន់ Render និង Vercel អ្នកត្រូវមាន Git Repository នៅលើ GitHub ជាមុនសិន៖

1. បើក Terminal នៅក្នុង Folder គម្រោង (`Booth_System`) រួចដំណើរការ៖
   ```bash
   git init
   git add .
   git commit -m "feat: prepare production deployment for Render and Vercel"
   ```
2. បង្កើត Repository ថ្មីមួយនៅលើ [GitHub](https://github.com/new) (ដាក់ឈ្មោះថា `booth-system` ឬ `expohub`)។
3. ភ្ជាប់ និងរុញកូដទៅកាន់ GitHub៖
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

---

## ជំហានទី ២៖ បង្កើត Database និង Backend នៅលើ Render

### វិធីទី ១ (ងាយស្រួលបំផុត)៖ ប្រើ Render Blueprint (`render.yaml`)

នៅក្នុងកូដនេះ ខ្ញុំបានរៀបចំឯកសារ `render.yaml` ទុកជាស្រេច៖
1. ចូលទៅកាន់ [Render Dashboard](https://dashboard.render.com/)។
2. ចុចប៊ូតុង **"New +"** (នៅជ្រុងខាងស្តាំខាងលើ) រួចជ្រើសរើស **"Blueprint"**។
3. ជ្រើសរើស Repository GitHub របស់អ្នកដែលទើបរុញរួច។
4. Render នឹងស្គាល់ `render.yaml` ដោយស្វ័យប្រវត្តិនឹងបង្កើត៖
   - **PostgreSQL Database** (`expohub-db`)
   - **FastAPI Web Service** (`expohub-backend`)
5. ចុច **"Apply"**។

---

### វិធីទី ២៖ បង្កើតដោយផ្ទាល់ដៃ (Manual Setup តាម Dashboard)

ប្រសិនបើលោកអ្នកចង់បង្កើតម្តងមួយជំហានៗដោយផ្ទាល់ដៃ៖

#### ក. បង្កើត PostgreSQL Database ជាមុន
1. នៅក្នុង Render Dashboard ចុច **"New +"** -> **"PostgreSQL"**។
2. បំពេញព័ត៌មាន៖
   - **Name**: `expohub-db`
   - **Database**: `expohub`
   - **User**: `expohub_user`
   - **Region**: ជ្រើសរើស **Singapore (Southeast Asia)** (ដើម្បីឱ្យដំណើរការលឿនជិតកម្ពុជា)
   - **Instance Type**: **Free**
3. ចុច **"Create Database"**។
4. នៅពេលបង្កើតរួច ចម្លងទុកនូវ **"Internal Database URL"** (ប្រសិនបើ Web Service នៅ Region ដូចគ្នា) ឬ **"External Database URL"**។

#### ខ. បង្កើត Web Service សម្រាប់ Backend
1. នៅក្នុង Render Dashboard ចុច **"New +"** -> **"Web Service"**។
2. ជ្រើសរើស Repository GitHub របស់អ្នក។
3. កំណត់ Settings ដូចខាងក្រោម៖
   - **Name**: `expohub-backend`
   - **Region**: ជ្រើសរើសដូចគ្នានឹង Database (ឧ. **Singapore**)
   - **Branch**: `main`
   - **Root Directory**: `backend` *(សំខាន់ណាស់!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**

4. **កំណត់ Environment Variables (ក្នុងផ្នែក "Environment Variables")**៖
   ចុច **"Add Environment Variable"** ហើយបញ្ចូល៖
   | Key | Value | ការពន្យល់ |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | *(បិទភ្ជាប់ Connection String ពី Database)* | URL ភ្ជាប់ទៅកាន់ PostgreSQL |
   | `COOKIE_SECURE` | `1` | បើកសុវត្ថិភាព HTTPS Cookie |
   | `COOKIE_SAMESITE` | `none` | អនុញ្ញាតឱ្យ Vercel ផ្ញើ Cookie មក Render បាន |
   | `ALLOW_REMOTE_SETUP` | `1` | អនុញ្ញាតឱ្យបង្កើត Admin ដំបូងតាម Browser |
   | `ALLOWED_ORIGINS` | `http://localhost:5173` *(នឹងបន្ថែម Vercel URL នៅជំហានទី ៤)* | ដែនដែលអនុញ្ញាត CORS |
   | `PYTHON_VERSION` | `3.12.0` | កំណែ Python ផ្លូវការ |

5. ចុច **"Deploy Web Service"**។
6. រង់ចាំពីរបីនាទី រហូតដល់ Render បង្ហាញពាក្យថា **"Live"**។
7. ចម្លងយក URL របស់ Backend (ឧទាហរណ៍៖ `https://expohub-backend.onrender.com`)។

---

## ជំហានទី ៣៖ ដាក់ពង្រាយ Frontend នៅលើ Vercel

1. ចូលទៅកាន់ [Vercel Dashboard](https://vercel.com/dashboard)។
2. ចុច **"Add New..."** -> **"Project"**។
3. ស្វែងរក និងជ្រើសរើស Repository GitHub របស់អ្នក រួចចុច **"Import"**។
4. កំណត់ Project Configuration ដូចខាងក្រោម៖
   - **Framework Preset**: `Vite` (Vercel នឹងសម្គាល់ស្វ័យប្រវត្តិ)
   - **Root Directory**: ចុចប៊ូតុង **"Edit"** រួចជ្រើសរើស folder **`frontend`** *(សំខាន់ណាស់!)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **កំណត់ Environment Variables (ផ្នែក "Environment Variables")**៖
   - **Name / Key**: `VITE_API_BASE`
   - **Value**: URL របស់ Render Backend បូកបន្ថែម `/api` នៅខាងចុង
     - ឧទាហរណ៍៖ `https://expohub-backend.onrender.com/api`
6. ចុច **"Deploy"**។
7. រង់ចាំប្រមាណ ១ នាទី Vercel នឹង Deploy ជោគជ័យ ហើយផ្តល់ URL ជូនអ្នក (ឧទាហរណ៍៖ `https://expohub-booth.vercel.app`)។

---

## ជំហានទី ៤៖ ភ្ជាប់ដែន Vercel ត្រឡប់មក Backend CORS វិញ (Final Link)

ដើម្បីឱ្យ Browser អាចហៅ API ពី Vercel ទៅ Render ដោយគ្មានបញ្ហា CORS៖

1. ចម្លងយក Production URL របស់ Frontend ពី Vercel (ឧ. `https://expohub-booth.vercel.app`)។
2. ត្រឡប់ទៅកាន់ **Render Dashboard** -> ចុចលើ **`expohub-backend`** -> ចូលទៅកាន់ម៉ឺនុយ **"Environment"**។
3. កែប្រែអថេរ `ALLOWED_ORIGINS` ដោយបន្ថែម Vercel URL ចូល៖
   ```text
   ALLOWED_ORIGINS=https://expohub-booth.vercel.app,http://localhost:5173
   ```
4. ចុច **"Save Changes"**។ Render នឹងធ្វើការ Redeploy ឡើងវិញដោយស្វ័យប្រវត្តិក្នងរយៈពេល ១ នាទី។

---

## ជំហានទី ៥៖ បង្កើតគណនី Admin ដំបូងលើ Production (Initial Setup)

1. បើក Browser ហើយចូលទៅកាន់គេហទំព័រ Vercel របស់អ្នក (ឧ. `https://expohub-booth.vercel.app`)។
2. ដោយសារប្រព័ន្ធស្ថិតក្នុងស្ថានភាពស្អាត (Clean State) អ្នកនឹងឃើញផ្ទាំង **Initial Workspace Setup (ការដំឡើងដំបូង)** ដោយស្វ័យប្រវត្តិ។
3. បំពេញ៖
   - ឈ្មោះ Administrator (ឧ. `System Admin`)
   - អ៊ីមែលផ្លូវការ (ឧ. `admin@expohub.com`)
   - លេខសម្ងាត់សុវត្ថិភាព (Password)
4. ចុច **"Complete Setup"**។
5. រួចរាល់! ប្រព័ន្ធនឹង Login ចូលផ្ទាំងគ្រប់គ្រង Admin Dashboard ភ្លាមៗ។

---

## ចំណុចសំខាន់ៗគួរដឹង (Important Production Notes)

### ១. ភាពខុសគ្នានៃ Render Free Tier (Cold Start)
- សេវា Render Web Service គម្រោង Free នឹងចូលគេង (Sleep) ប្រសិនបើគ្មានអ្នកចូលប្រើលើសពី ១៥ នាទី។
- នៅពេលមានអ្នកចូលប្រើលើកដំបូង Backend ត្រូវការពេលប្រហែល **៣០ ទៅ ៥០ វិនាទី** ដើម្បីភ្ញាក់ឡើងវិញ (Spin up)។ Frontend នឹងរង់ចាំ API ឆ្លើយតបដោយស្វ័យប្រវត្តិ។

### ២. ការបិទ Setup Wizard ក្រោយពេលដំឡើងរួច
- បន្ទាប់ពីលោកអ្នកបានបង្កើតគណនី Admin លើកដំបូងរួចរាល់ ប្រព័ន្ធនឹងបិទ Setup Endpoint ដោយស្វ័យប្រវត្តិ។
- ប្រសិនបើលោកអ្នកចង់បង្កើនសុវត្ថិភាពបន្ថែមទៀត អាចចូលទៅ Render Environment Variables រួចប្តូរ `ALLOW_REMOTE_SETUP=0`។

### ៣. SPA Routing លើ Vercel
- ឯកសារ `frontend/vercel.json` ត្រូវបានបង្កើតរួចជាស្រេច ដើម្បីធានាថាពេលអ្នក Refresh ទំព័រ (ដូចជាទំព័រ `/admin` ឬ `/booths`) វានឹងមិនចេញ Error `404: NOT_FOUND` ឡើយ។
