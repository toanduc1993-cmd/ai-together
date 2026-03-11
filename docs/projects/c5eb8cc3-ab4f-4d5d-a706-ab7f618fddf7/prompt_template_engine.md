# Prompt Template Engine — MKT AI-First

## Là Gì?

**Prompt Template Engine** là lớp trung gian điều khiển cách các AI Agent "ra lệnh" cho Claude. Thay vì hardcode một đống text, mỗi agent có **system prompt** (vai trò) và **user prompt** (nhiệm vụ cụ thể) được xây dựng động từ dữ liệu campaign thật.

```
Dữ liệu Campaign  →  Template Engine  →  Claude API  →  Structured Output
(goal, budget,        (điền biến vào      (gọi LLM)      (JSON kết quả)
 client, lang...)      prompt template)
```

---

## Kiến Trúc

### BaseAgent — Nền Tảng

Tất cả agents kế thừa từ `BaseAgent` trong `backend/agents/base.py`:

```python
class BaseAgent(ABC):
    def get_system_prompt(self, **kwargs) -> str:  # Abstract: vai trò agent
        ...
    async def execute(self, **kwargs) -> AgentResult:  # Abstract: nhiệm vụ
        ...
    async def call_llm(self, user_prompt, json_output=True) -> AgentResult:
        # Gửi prompt → Claude, trả về JSON chuẩn
        # Có retry logic (max 2 lần) + exponential backoff
        # Có mock mode để test không tốn API
        ...
```

**AgentResult** — Output chuẩn của mọi agent:

```python
@dataclass
class AgentResult:
    success: bool
    agent_type: str      # "cmo", "copywriter", "seo", "analytics"
    output: dict         # JSON kết quả từ Claude
    raw_text: str        # Text thô
    duration_ms: int     # Thời gian xử lý
    input_tokens: int    # Số token đầu vào (chi phí)
    output_tokens: int   # Số token đầu ra
    error: str | None
```

---

## 4 Agent Templates

### 1. CMO Agent — Chiến Lược

**System Prompt** (vai trò cố định):
> Bạn là CMO AI, não chiến lược của hệ thống. Nhận mục tiêu kinh doanh và dịch thành chiến lược marketing khả thi. Luôn dùng SMART goals, cân nhắc thị trường Việt Nam (Zalo, Shopee, TikTok), lượng hóa kết quả với khoảng conservative/optimistic.

**User Prompt Template** (điền từ campaign data):
```
Client: {client_name}
Industry: {industry}
Business Goal: {goal}
Total Budget: ${budget}
Language: Vietnamese / English

→ Trả về JSON: strategy, KPIs, channels, timeline, content_plan, expected_results, risks
```

**Ví dụ Input:**
```
Goal: "Tăng leads 30% trong Q1 2026, ngân sách $5,000, ngành Tech SaaS"
```

**Ví dụ Output:**
```json
{
  "strategy_summary": "Tập trung vào content marketing và Google Ads...",
  "kpis": [
    {"name": "Leads/month", "target": 130, "current": 0, "unit": "leads"},
    {"name": "Website visitors", "target": 15000, "current": 0, "unit": "visits"}
  ],
  "channels": [
    {"name": "Content & SEO", "budget_pct": 30, "budget_amount": 1500},
    {"name": "Google Ads", "budget_pct": 25, "budget_amount": 1250}
  ]
}
```

---

### 2. Copywriter Agent — Nội Dung

**System Prompt** (động theo client):
> Bạn là AI copywriter chuyên nghiệp. Viết content tiếng Việt/Anh native-level, SEO-optimized, theo brand voice của client.
> 
> _[Nếu có brand_voice:]_ Tone: professional. Từ dùng: [keyword1, keyword2]. Tránh: [word1, word2]
> _[Nếu có target_audience:]_ Demographics: Gen Z 18-25. Pain points: giá cao, khó dùng

**User Prompt Templates theo loại nội dung:**

| Loại | Template | Output |
|---|---|---|
| `blog` | "Viết blog SEO cho {client_name}, goal: {goal}, topic: {topic}" | title, body (HTML 1500-2500w), meta tags, keywords, seo_score |
| `ad_copy` | "Tạo ad copy cho {platform}, goal: {goal}" | headlines (3), descriptions (2), CTA, keywords |
| `social` | "Viết {platform} post, goal: {goal}" | body, hashtags, CTA, best_posting_time |
| `email` | "Tạo marketing email cho {client_name}" | subject_line, preview_text, body (HTML), cta |
| `landing_page` | "Viết landing page cho {client_name}" | hero, features (3-4), social proof, FAQ, CTA |

---

### 3. SEO Agent — Tối Ưu Tìm Kiếm

**3 nhiệm vụ có template riêng:**

**analyze** — Phân tích content đã có:
```
Title: {title}
Content: {body} (truncate 3000 chars)
→ Output: seo_score, meta_title, meta_description, keywords, suggestions (high/medium/low)
```

**keywords** — Research từ khóa:
```
Topic: {topic}, Industry: {industry}, Language: {vi/en}
→ Output: primary_keywords (volume, difficulty, intent), long_tail_keywords, question_keywords, content_clusters
```

**audit** — Audit toàn bộ content:
```
Content list: [{type, title, seo_score}]
→ Output: overall_score, top_issues, quick_wins, monthly_plan
```

---

### 4. Analytics Agent — Báo Cáo

**report** — Tổng hợp hiệu suất:
```
Campaign: {campaign_name}
KPIs: [{name, target, current, progress%}]
→ Output: executive_summary, kpi_analysis, top_performing, recommendations (priority: high)
```

---

## Hai Chế Độ Hoạt Động

### AGENT_MODE=mock (Demo)
```python
def _mock_response(self, user_prompt) -> AgentResult:
    return AgentResult(
        output={"message": f"Mock từ {self.agent_name}"},
        model="mock",
        duration_ms=100
    )
```
- Không gọi Claude API
- Trả về response giả, không tốn tiền
- Dùng cho: demo, testing, development

### AGENT_MODE=live (Thật)
```python
response = await asyncio.to_thread(
    anthropic.messages.create,
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    system=system_prompt,
    messages=[{"role": "user", "content": user_prompt}]
)
```
- Gọi Claude API thật
- Output JSON động, cá nhân hóa theo từng campaign
- Retry tối đa 2 lần nếu lỗi, backoff 2^attempt giây

---

## Luồng Dữ Liệu Thực Tế

```
Manager tạo Campaign:
  goal = "Tăng leads 30%, Q1 2026"
  client = "TechStartup VN"
  budget = 5000
  language = "vi"
          │
          ▼
Campaign Orchestrator.launch_campaign()
          │
          ├─ Step 1: cmo_agent.execute(task="strategy", goal=..., budget=...)
          │          └─ Template điền: client=TechStartup, budget=$5000...
          │          └─ Claude trả về: strategy JSON + KPIs
          │
          ├─ Step 2: copywriter_agent.execute(content_type="blog", goal=..., lang="vi")
          │          └─ Template điền: client=TechStartup, topic=goal...
          │          └─ Claude trả về: blog HTML tiếng Việt + SEO score 87
          │
          ├─ Step 3: seo_agent.execute(task="analyze", title=..., body=...)
          │          └─ Template điền: title/body từ blog vừa tạo
          │          └─ Claude trả về: keywords, meta tags, suggestions
          │
          └─ Step 4: analytics_agent.execute(task="report", kpis=[...])
                     └─ Claude trả về: forecast, recommendations
```

---

## Tại Sao Template Engine Quan Trọng?

Thay vì:
```python
# ❌ Hardcode — không thể tái sử dụng
prompt = "Write blog about marketing"
```

Engine làm:
```python
# ✅ Dynamic template — mỗi campaign khác nhau
prompt = f"""
Client: {client_name}
Industry: {industry}
Goal: {campaign_goal}
Language: {lang}
Brand voice: {brand_voice.get('tone', 'professional')}
"""
```

**Lợi ích:**
- Mỗi client nhận content phù hợp context thật sự của họ
- Dễ A/B test từng phần của prompt
- Scale lên nhiều client mà không cần sửa code
- Kiểm soát format output (JSON structured) để lưu DB nhất quán
