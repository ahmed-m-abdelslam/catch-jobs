<div align="center">

# 🎯 CatchJobs

### AI-Powered Job Aggregator & Recommendation Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://catch-jobs.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://catch-jobs-production.up.railway.app/api/jobs/stats)

<p align="center">
  <strong>Automatically scrapes 27,000+ jobs from 5 sources, generates AI embeddings, and delivers personalized recommendations with email notifications.</strong>
</p>

---

</div>

## ✨ Features

### 🔍 Multi-Source Job Scraping
Automated scraping every 10 minutes from **5 job platforms**:
| Source | Type | Jobs |
|--------|------|------|
| **LinkedIn** | Guest API scraping | 24,000+ |
| **Wuzzuf** | HTML scraping | 1,800+ |
| **Arbeitnow** | API | 300+ |
| **Jobicy** | API | 200+ |
| **RemoteOK** | API | 180+ |

### 🤖 AI-Powered Recommendations
- **OpenAI Embeddings** (`text-embedding-3-small`, 1536 dimensions) for semantic job matching
- Personalized "For You" feed based on user preferences
- Similarity scoring with freshness bonus (newer jobs rank higher)
- Smart deduplication by title + company

### 🔔 Real-Time Notifications
- **In-app notifications** when new jobs match your preferences (similarity >= 0.65)
- **Email notifications** via Gmail SMTP with styled HTML templates
- Unread count badge on the notification bell

### 💾 Job Management
- Save/unsave jobs with animated heart button
- Search across all jobs with pagination
- Filter by source, country, and date

### 🎨 Modern UI
- Clean, responsive dashboard with dark/light mode support
- Gradient accents and smooth hover animations
- Fixed-height job cards with "Show more/less" for long descriptions
- Mobile-friendly design

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│              Next.js 14 + React                  │
│         Deployed on Vercel                       │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│                   Backend                        │
│              FastAPI + Python                    │
│         Deployed on Railway                      │
│                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐ │
│  │  Scrapers    │  │  AI Engine   │  │  Auth   │ │
│  │  (5 sources) │  │  (OpenAI)    │  │  (JWT)  │ │
│  └─────────────┘  └──────────────┘  └────────┘ │
│                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐ │
│  │ Notifications│  │  Background  │  │  SMTP   │ │
│  │  (in-app)   │  │  Scheduler   │  │ (Gmail) │ │
│  └─────────────┘  └──────────────┘  └────────┘ │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│               PostgreSQL + pgvector              │
│              (Supabase / Railway)                │
│                                                  │
│  jobs │ job_embeddings │ users │ preferences     │
│  user_notifications │ saved_jobs                 │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Backend** | FastAPI, Python 3.12, Uvicorn |
| **Database** | PostgreSQL + pgvector (1536-dim vectors) |
| **AI/ML** | OpenAI text-embedding-3-small |
| **Scraping** | httpx, BeautifulSoup4 |
| **Auth** | JWT (python-jose), bcrypt |
| **Email** | SMTP (Gmail) |
| **Deployment** | Vercel (frontend), Railway (backend + DB) |

---

## 📁 Project Structure

```
CatchJobs/
├── backend/
│   ├── app/
│   │   ├── api/              # REST endpoints
│   │   │   ├── auth.py       # Login, register, JWT
│   │   │   ├── jobs.py       # Job listing, search, recommendations
│   │   │   ├── preferences.py # User job preferences
│   │   │   ├── notifications.py # In-app notifications
│   │   │   ├── backfill.py   # Embedding management
│   │   │   └── scrape.py     # Manual scrape trigger
│   │   ├── scrapers/         # Job source scrapers
│   │   │   ├── linkedin.py   # LinkedIn guest API
│   │   │   ├── wuzzuf.py     # Wuzzuf HTML parser
│   │   │   ├── remoteok.py   # RemoteOK JSON API
│   │   │   ├── arbeitnow.py  # Arbeitnow API
│   │   │   └── jobicy.py     # Jobicy API
│   │   ├── services/         # Business logic
│   │   │   ├── embedding.py  # OpenAI embedding generation
│   │   │   ├── matching.py   # AI recommendation engine
│   │   │   └── notification.py # Email notifications
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── tasks/            # Background scraping tasks
│   │   ├── main.py           # FastAPI app + background scheduler
│   │   └── config.py         # Environment configuration
│   ├── Dockerfile
│   ├── requirements.txt
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/    # Main dashboard page
│   │   │   ├── login/        # Authentication page
│   │   │   └── jobs/         # Job detail pages
│   │   ├── components/
│   │   │   └── JobCard.tsx   # Job card component
│   │   └── lib/
│   │       └── api.ts        # API client
│   ├── public/               # Static assets & favicon
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL with pgvector extension
- OpenAI API key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << ENV
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/catchjobs
SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-your-openai-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ENV

# Run
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Run
npm run dev
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Get JWT token |
| `GET` | `/api/jobs` | List jobs (paginated, searchable) |
| `GET` | `/api/jobs/recommended` | AI-powered recommendations |
| `GET` | `/api/jobs/stats` | Job statistics |
| `GET` | `/api/preferences` | Get user preferences |
| `POST` | `/api/preferences` | Add job preference |
| `GET` | `/api/notifications` | List notifications |
| `GET` | `/api/notifications/count` | Unread count |
| `PUT` | `/api/notifications/read-all` | Mark all read |
| `GET` | `/api/jobs/saved` | Saved jobs |
| `POST` | `/api/jobs/{id}/save` | Save a job |
| `POST` | `/api/scrape/trigger` | Manual scrape |
| `GET` | `/api/backfill/embedding-stats` | Embedding statistics |

---

## 🔧 How It Works

1. **Scraping** — Background scheduler runs every 10 minutes, scraping jobs from 5 sources using 25+ search terms enriched with user preferences.

2. **Embedding** — Each new job gets an OpenAI embedding (1536-dim vector) capturing its semantic meaning from title, company, and description.

3. **Matching** — When a user opens "For You", their preference embeddings are compared against all job embeddings using cosine similarity. Jobs scoring >= 0.65 are returned, sorted by date (newest first).

4. **Notifications** — After each scrape, new jobs are matched against all user preferences. Matches trigger in-app notifications and email alerts.

---

## 👤 Author

**Ahmed Mahmoud**

---

<div align="center">
  <sub>Built with ❤️ using FastAPI, Next.js, and OpenAI</sub>
</div>
