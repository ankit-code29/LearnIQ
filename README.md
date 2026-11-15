# LearnIQ

LearnIQ is an adaptive AI learning and intelligence platform for turning uploaded study material into an interactive learning experience.

## Current milestone

The project now includes the backend foundation, database layer, and authentication/document API layer for the LearnIQ architecture:

- FastAPI app factory and versioned routing
- Health and DB readiness endpoints
- SQLAlchemy models for users, documents and quiz records
- Repository and service-layer structure for data access
- JWT-based authentication for register/login/current-user flows
- Protected document creation and listing endpoints
- SQLite default database for local development with Postgres-ready config
- Automated test coverage for health, database round-tripping, auth and document workflows

## Real AI LLM API Configuration

LearnIQ supports real LLM APIs for AI-powered PDF analysis and quiz generation:
- **Google Gemini API** (`gemini-1.5-flash` or `gemini-2.0-flash` - recommended, free tier available)
- **OpenAI API / Compatible** (`gpt-4o-mini`, Groq, OpenRouter, Ollama)

### Setup in `backend/.env`:
```ini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```
Or for OpenAI / Groq:
```ini
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

*Note: If no API key is provided, LearnIQ automatically runs with its built-in fallback engine, so the app remains fully functional.*

## Run locally

### Backend API

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend UI

```bash
cd frontend
npm install
copy .env.example .env
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

Example auth flow in the UI:
1. Register a new account
2. Log in with the same credentials
3. Upload a PDF study file
4. Generate a quiz from a topic
5. Answer and submit the quiz
6. Review mastery and recommendations

Example API flow:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me with Bearer token
- POST /api/v1/documents/upload
- POST /api/v1/quizzes
- POST /api/v1/quizzes/{quiz_id}/submit
