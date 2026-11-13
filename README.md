# BRANDGUARD AI
### Intelligent Brand Governance – Before Every Publish.

> **DETECT → EXPLAIN → CORRECT → APPROVE**  
> An enterprise AI-powered brand governance platform that detects brand inconsistencies, audits promotional claims against ground-truth company records, suggests smart corrections, and orchestrates human review workflows prior to publishing.

---

## 1. Project Overview

Modern companies produce vast volumes of marketing collateral across distributed internal teams, external creative agencies, freelancers, and generative AI tools. This frequently leads to:
- **Outdated Logos & Distorted Brand Marks**
- **Unapproved / Off-Palette Colors** (e.g., rogue neon or saturated reds)
- **Unsupported Promotional Claims** (e.g., claiming "100% improved performance" instead of an audited "25%")
- **Inconsistent Voice & Unprofessional Tone** (e.g., excessive slang or hyperbolic superlatives)
- **Prohibited & Deprecated Terminology** (e.g., using deprecated legacy product names)
- **Accessibility Deficiencies** (e.g., insufficient WCAG 2.1 AA text contrast ratios)
- **Time-Consuming Manual Approval Bottlenecks**

**BrandGuard AI** acts as an intelligent pre-publish quality-control gate. It audits uploaded PDFs, DOCX documents, TXT copy, and visual creative assets against approved corporate brand guidelines, explains detected violations with exact evidence, generates smart replacements, and routes assets through an enterprise human review and sign-off workflow.

---

## 2. Design System: Light Lavender Purple

BrandGuard AI is crafted with a modern, elegant **Light Lavender Purple** SaaS aesthetic:
- **Primary Background**: `#F8F6FF`
- **Sidebar & Card Background**: `#FFFFFF`
- **Primary Purple**: `#7C3AED`
- **Primary Hover**: `#6D28D9`
- **Light Purple Accent**: `#EDE9FE`
- **Main Text**: `#2E2459`
- **Secondary Text**: `#77718A`
- **Border Lines**: `#E8E3F2`
- **Status Accents**: Green (`#16A34A`), Amber (`#F59E0B`), Critical Red (`#DC2626`), Blue (`#2563EB`)

---

## 3. Technology Stack

### Frontend
- **React 19** with **Vite**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router v7**
- **Lucide React** (enterprise iconography)
- **Recharts** (compliance velocity, category distributions, monthly volume charts)
- **Axios** (interceptors, token-based authorization)

### Backend
- **Python 3.13**
- **Flask** & **Flask-CORS**
- **Flask-SQLAlchemy** (relational models & migrations)
- **Werkzeug** (cryptographic password hashing & security)
- **PyMuPDF (`fitz`)** (high-fidelity PDF text extraction)
- **python-docx** (DOCX structure extraction)
- **Pillow (PIL)** (dominant image color extraction & WCAG luminance calculation)
- **Requests** (Google Gemini REST integration)

### Database
- **SQLite** (local zero-configuration development fallback at `backend/brandguard.db`)
- **PostgreSQL** compatible via SQLAlchemy connection string

### AI Analysis Engine
- **Dual-Engine Architecture**:
  1. **Google Gemini API** (Multimodal LLM analysis with strict structured JSON schema)
  2. **Deterministic Ground-Truth Engine** (Comprehensive rule-matching against database records; runs reliably without external credentials)

---

## 4. Multi-Tenant Role-Based Access Control (RBAC)

BrandGuard AI enforces four distinct organizational personas:

| Role | Permissions & Responsibilities |
|---|---|
| **ADMIN** | Manage organization profile, invite/edit users, manage brand guidelines, rules, logos, and reset demo datasets. |
| **CONTENT CREATOR** | Upload assets, execute AI governance audits, review detected issues, apply smart suggestions, submit for review. |
| **BRAND REVIEWER** | Inspect submitted content, add reviewer comments, approve assets, reject assets, or request revisions. |
| **MARKETING MANAGER** | Monitor compliance velocity, view recurring violation trends, and export CSV audit reports. |

---

## 5. Quick Start Instructions

### Prerequisites
- **Node.js** (v18+ or v20+) and **npm**
- **Python** (v3.10+)

---

### Step 1: Backend Setup & Execution

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (Optional):
   ```bash
   cp .env.example .env
   ```
   *(If you have a Google Gemini API Key, set `GEMINI_API_KEY=AIzaSy...`. If left empty, BrandGuard AI seamlessly runs with its high-precision built-in deterministic engine).*

5. Start the backend API server:
   ```bash
   python run.py
   ```
   *The Flask API starts on `http://127.0.0.1:5000` and automatically initializes database tables and the TechNova demo organization.*

---

### Step 2: Frontend Setup & Execution

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The React application will be available at `http://localhost:5173`.*

---

## 6. Demonstration Credentials (TechNova Solutions)

The database comes pre-seeded with a complete enterprise demo dataset (**TechNova Solutions**). You can sign in using any of the four pre-configured accounts:

| Persona | Email | Password | Role Focus |
|---|---|---|---|
| **Sarah Connor** | `admin@technova.com` | `password123` | Organization Admin |
| **Alex Rivera** | `creator@technova.com` | `password123` | Content Creator |
| **David Chen** | `reviewer@technova.com` | `password123` | Brand Reviewer |
| **Elena Rostova** | `manager@technova.com` | `password123` | Marketing Manager |

> **Pro Tip**: The application features an **Instant Persona Switcher** on the login page and inside the sidebar footer, allowing you to test Creator submission and Reviewer approval without logging out.

---

## 7. End-to-End Testing Workflow

To experience the full **DETECT → EXPLAIN → CORRECT → APPROVE** lifecycle:

1. **Sign In**: Log in as `creator@technova.com` (or use the one-click demo login).
2. **Review Knowledge Base**: Visit **Brand Knowledge Base** to inspect TechNova's approved colors (`#7C3AED`, `#EDE9FE`), official claim (`25% improved performance`), and prohibited terms (`LegacyCloud`).
3. **Upload Content**: Go to **Upload Content**, drop a sample text/PDF or create a new file containing intentional brand violations:
   > *"Yo team! Our new cloud solution provides 100% improved performance and is 100% guaranteed. Powered by LegacyCloud. Theme: #FF0000."*
4. **Execute AI Audit**: Click **Upload & Run AI Analysis**.
5. **Inspect Violations**: View the **Audit Results**:
   - Critical unsupported claim (100% vs 25% verified benchmark)
   - Prohibited word (`LegacyCloud`)
   - Unapproved color (`#FF0000` vs primary `#7C3AED`)
   - Tone mismatch (`Yo team!`)
6. **Smart Corrections**: Click **Smart Correction Studio**. View the side-by-side comparison. Click **Accept** or **Apply All** to update the active draft.
7. **Submit for Human Review**: Click **Submit Corrected Draft** to route to the Brand Reviewer queue.
8. **Approve Asset**: Switch role to `David Chen` (Brand Reviewer) via the sidebar selector. Navigate to **Review & Approval**, inspect the submission, add a review comment, and click **Approve for Publish**.
9. **Verify Real Database Statistics**: Visit the **Governance Dashboard** and **Brand Intelligence Analytics** to see metrics updated dynamically from database records.
10. **Export Report**: In Analytics, click **Export Governance Report (CSV)** to download an audit spreadsheet.

---

## 8. Automated Integration Testing

To execute the automated 13-step backend verification test:

```bash
cd backend
python test_workflow.py
```

This script verifies:
1. Health endpoint (`/api/health`)
2. Invalid credential rejection (401)
3. Authenticated session token issuance
4. Real-time database metrics computation
5. Knowledge base retrieval
6. Content upload & text extraction
7. AI analysis engine rule matching & confidence scoring
8. Smart suggestion acceptance & revision history recording
9. Review submission
10. Review comment thread logging
11. Reviewer approval authorization
12. Database metric increment verification
13. CSV export payload generation

---

## 9. Folder Structure

```
brandguard-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, Navbar, StatCard, Badge, Modal, EmptyState
│   │   ├── context/         # AuthContext (RBAC, Persona Switcher), ToastContext
│   │   ├── layouts/         # DashboardLayout, PublicLayout
│   │   ├── pages/           # 15 Complete application views
│   │   ├── services/        # Axios API client with bearer token injection
│   │   ├── App.jsx          # Protected routing setup
│   │   ├── index.css        # Lavender Purple theme & Tailwind v4
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js       # Vite proxy configuration for /api and /uploads
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── ai/              # BrandAnalysisEngine (Gemini LLM & Deterministic)
│   │   ├── middleware/      # Auth middleware, JWT verification, RBAC guards
│   │   ├── models/          # SQLAlchemy relational models (14 tables)
│   │   ├── processors/      # PyMuPDF, python-docx, Pillow color/WCAG extractors
│   │   ├── routes/          # REST endpoints (auth, dashboard, brands, content, ...)
│   │   └── services/        # TechNova demonstration data seeder
│   ├── uploads/             # Secure isolated file storage
│   ├── config.py            # Application configuration & upload limits
│   ├── run.py               # Flask server entrypoint (port 5000)
│   ├── test_workflow.py     # Automated integration test suite
│   └── requirements.txt
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 10. License & Production Standards

Developed with enterprise security best practices:
- Passwords hashed using PBKDF2 with SHA-256
- Role-based authorization enforced at both API and UI layers
- Organization multi-tenancy prevents cross-tenant data leakage
- Uploaded files validated against permitted extensions and mime types
- Zero hardcoded API credentials or mock statistics
