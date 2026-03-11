# Platform Architecture — MKT AI-First

## Tổng Quan

**MKT AI-First** là nền tảng SaaS white-label giúp các marketing agency tự động hóa quy trình với AI. Hệ thống gồm 3 lớp chính: Frontend SPA, Backend API, và AI Agent Layer.

---

## Tech Stack

| Layer | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | HTML + Vanilla JS (SPA) | Giao diện người dùng |
| **Backend API** | Python 3.11 + FastAPI | REST API, xử lý nghiệp vụ |
| **Database** | PostgreSQL + SQLAlchemy (async) | Lưu trữ dữ liệu |
| **AI Engine** | Anthropic Claude (claude-sonnet-4) | Tạo nội dung, phân tích |
| **Auth** | JWT (python-jose) + bcrypt | Xác thực phân quyền |
| **Deploy** | Railway (backend + DB) | Hosting |

---

## Sơ Đồ Kiến Trúc

```
┌─────────────────────────────────────────┐
│              BROWSER (Client)           │
│  ┌──────────────────────────────┐       │
│  │   Frontend SPA (Vanilla JS)  │       │
│  │   Login / Dashboard          │       │
│  │   Campaigns / Content        │       │
│  │   Admin / White-label        │       │
│  └──────────────┬───────────────┘       │
└─────────────────┼───────────────────────┘
                  │ HTTP REST / JSON
                  ▼
┌─────────────────────────────────────────┐
│           BACKEND (FastAPI)             │
│  ┌──────────┐  ┌──────────┐            │
│  │  Routers │  │Middleware│            │
│  │ /auth    │  │ JWT Auth │            │
│  │ /agencies│  │ CORS     │            │
│  │ /campaigns  └──────────┘            │
│  │ /content │  ┌──────────────────┐   │
│  │ /agents  │  │ AI Agent Layer   │   │
│  └──────────┘  │  Orchestrator    │   │
│                │  CMO Agent       │   │
│                │  Copywriter      │   │
│                │  SEO Agent       │   │
│                │  Analytics Agent │   │
│                └────────┬─────────┘   │
└─────────────────────────┼─────────────┘
           ┌──────────────┤
           ▼              ▼
  ┌──────────────┐  ┌──────────────┐
  │  PostgreSQL  │  │  Anthropic   │
  │  Database    │  │  Claude API  │
  └──────────────┘  └──────────────┘
```

---

## Cấu Trúc Thư Mục

```
MKT AI-First/
├── frontend/
│   ├── css/design-system.css      # Dark theme, glassmorphism
│   └── js/
│       ├── mock-data.js           # Mock data offline
│       ├── mock-api.js            # Mock API layer
│       ├── api.js / auth.js       # API client, JWT
│       ├── i18n.js / theme.js     # VI/EN, white-label
│       ├── app.js                 # SPA Router
│       ├── agent-simulator.js     # AI workflow animation
│       ├── components/            # Sidebar, Header, Modal, Charts, Toast
│       └── views/
│           ├── admin/             # Dashboard, Clients, White-label
│           ├── manager/           # Dashboard, Campaigns, Approval
│           └── client/            # Dashboard, Content (read-only)
│
├── backend/
│   ├── main.py                    # App entry, startup seed
│   ├── config.py                  # Settings (.env)
│   ├── database.py                # SQLAlchemy async engine
│   ├── models/                    # ORM: agency, campaign, content, user
│   ├── routers/                   # API routes: auth, agencies, campaigns...
│   ├── agents/
│   │   ├── base.py                # BaseAgent + retry logic
│   │   ├── orchestrator.py        # Multi-agent pipeline
│   │   ├── cmo_agent.py
│   │   ├── copywriter.py
│   │   ├── seo_agent.py
│   │   └── analytics_agent.py
│   └── seed.py                    # Demo data seeding
│
├── demo.html                      # Self-contained offline demo (387KB)
└── .env                           # Environment config
```

---

## API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập → JWT token |
| `GET` | `/api/agencies/clients` | Danh sách clients |
| `POST` | `/api/agencies/clients` | Tạo client mới |
| `GET/PUT` | `/api/agencies/white-label` | Cấu hình white-label |
| `GET` | `/api/campaigns` | Danh sách chiến dịch |
| `POST` | `/api/campaigns` | Tạo chiến dịch mới |
| `GET` | `/api/content/approval-queue` | Hàng đợi chờ duyệt |
| `POST` | `/api/content/{id}/approve` | Duyệt/từ chối |
| `POST` | `/api/agents/launch-campaign` | Chạy workflow AI 4 agents |
| `POST` | `/api/agents/generate-content` | Tạo nội dung AI |
| `GET` | `/api/analytics/dashboard-stats` | Thống kê tổng quan |

---

## Data Models

```
Agency (1) ──── (n) User      [ADMIN / MANAGER / CLIENT]
Agency (1) ──── (n) Client
Client  (1) ──── (n) Campaign
Campaign(1) ──── (n) Content   [generating → pending → approved → published]
Campaign(1) ──── (n) AgentLog
```

---

## AI Agent Pipeline

Khi Manager nhấn **"Launch Campaign"**, `CampaignOrchestrator` chạy tuần tự:

| Bước | Agent | Nhiệm vụ | Output |
|---|---|---|---|
| 1 | **CMO Agent** | Phân tích mục tiêu, lập chiến lược | Strategy JSON + KPIs + ngân sách |
| 2 | **Copywriter Agent** | Tạo nội dung (blog, ad copy, social) | Content HTML + SEO score |
| 3 | **SEO Agent** | Phân tích và tối ưu SEO | Keywords, meta tags, SEO score |
| 4 | **Analytics Agent** | Thiết lập tracking, dự báo | KPI baseline + forecast |

- Kết quả lưu DB, content → hàng đợi `pending_review`, campaign → `active`
- Toàn bộ có progress callback: Frontend nhận event realtime từng bước

---

## Cấu Hình Môi Trường

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-20250514

JWT_SECRET=your-secret-key

AGENT_MODE=mock     # "mock" = demo, "live" = AI thật
```
