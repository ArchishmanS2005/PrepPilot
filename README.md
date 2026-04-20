# PrepPilot

PrepPilot is a full-stack DSA practice tracker that helps users log coding problems, analyze weak topics, and get rule-based plus AI-powered practice suggestions.

The app has a lightweight landing page that opens into the main dashboard. The backend stores data in SQLite through FastAPI and SQLAlchemy, and the frontend is a React app built for simple day-to-day practice tracking.

## Project Summary for Future AI

```text
Project name: PrepPilot
Type: Full-stack DSA practice tracker
Goal: Track coding problems, surface weak topics, and suggest what to practice next.
Frontend: React (Create React App) in preppilot-ui
Frontend flow: LandingPage.jsx -> Get Started -> App.js dashboard
Backend: FastAPI in main.py
Database: SQLite via SQLAlchemy (preppilot.db)
Validation: Pydantic
AI: Gemini via google-genai with fallback suggestions when the API key is missing or AI fails
Important files: main.py, models.py, schemas.py, database.py, preppilot-ui/src/index.js, preppilot-ui/src/LandingPage.jsx, preppilot-ui/src/App.js
Privacy: do not commit .env, local databases, logs, or build artifacts
```

## What It Does

PrepPilot fixes the common problem of random practice by giving you:

- Structured problem tracking
- Topic-level analytics
- Weak-topic prioritization
- Actionable next-step suggestions
- A simple UI with a landing page and one-click start

## Features

### Problem management

- Add new DSA problems
- Edit existing problems
- Delete a single problem
- Delete all problems
- Delete problems by topic

### Analysis and suggestions

- Topic coverage analysis
- Weak-topic detection
- Rule-based practice suggestion
- AI coach suggestion (Gemini)
- Automatic fallback suggestion if AI is unavailable

### Productivity tools

- Search by title or topic
- Sort by time taken
- Sort by difficulty (Easy -> Medium -> Hard)
- Pagination support in backend

### Reliability

- Input validation with Pydantic
- Standardized JSON success and error responses
- Logging for API activity and failures
- SQLite persistence

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- python-dotenv
- google-genai (Gemini)

### Frontend

- React (Create React App)
- Custom CSS landing page + dashboard styling

## Project Structure

This is the core structure for the current app:

```text
PrepPilot/
	main.py                # FastAPI app and all routes
	models.py              # SQLAlchemy table model
	schemas.py             # Pydantic validation schema
	database.py            # DB engine/session setup
	requirements.txt       # Python dependencies
	preppilot-ui/
		package.json
		src/
			index.js           # Landing page -> app flow
			LandingPage.jsx    # Landing page component
			LandingPage.css    # Landing page styles
			App.js             # Main dashboard UI
			index.css
```

## Safe Editing Rules

If you are using another AI to work on this repository, these rules keep the project stable and private:

- Keep the working dashboard logic in preppilot-ui/src/App.js unless a change explicitly targets the dashboard.
- Keep the landing page in preppilot-ui/src/LandingPage.jsx, preppilot-ui/src/LandingPage.css, and preppilot-ui/src/index.js.
- Keep backend behavior in main.py and the database model/schema files.
- Store secrets only in .env and never commit them.
- Do not commit local databases, build outputs, or dependency folders.
- Preserve existing API route names unless you are intentionally changing the backend contract.

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm

### 1) Clone the repository

```bash
git clone https://github.com/ArchishmanS2005/PrepPilot.git
cd PrepPilot
```

### 2) Backend setup

```bash
python -m venv .venv
```

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Optional: create a .env file in the root for AI suggestions:

```env
GEMINI_API_KEY=your_api_key_here
```

Start backend:

```bash
uvicorn main:app --reload
```

Backend runs at:

- http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs

### 3) Frontend setup

Open a new terminal:

```bash
cd preppilot-ui
npm install
npm start
```

Frontend runs at:

- http://localhost:3000

## App Flow

1. Open the landing page.
2. Click Get Started.
3. Use the dashboard to add, update, search, sort, analyze, and delete problems.

## API Reference

### Health

- GET / -> API health check

### Problems

- POST /add-problem -> Add a problem
- GET /problems?page=1&limit=5 -> Get paginated problems
- PUT /update-problem/{problem_id} -> Update a problem by id
- DELETE /delete-problem/{problem_id} -> Delete one problem by id
- DELETE /delete-all -> Delete all problems
- DELETE /delete-topic/{topic} -> Delete all problems for an exact topic (case-insensitive)

### Search and sort

- GET /search?keyword=... -> Search title/topic
- GET /sort?by=time -> Sort by time
- GET /sort?by=difficulty -> Sort by difficulty

### Insights and suggestions

- GET /analyze -> Topic frequency + weak topics
- GET /suggest -> Rule-based suggestion
- GET /ai-suggest -> Gemini suggestion with fallback

## Data Model

Each problem contains:

- id: integer (auto)
- title: string (required, non-empty)
- topic: string (required, non-empty)
- difficulty: Easy | Medium | Hard
- solved: boolean
- time_taken: integer, >= 0

## API Response Format

Success response:

```json
{
	"status": "success",
	"message": "...",
	"data": {}
}
```

Error response:

```json
{
	"status": "error",
	"message": "..."
}
```

## Example Requests

### Add problem

```bash
curl -X POST "http://127.0.0.1:8000/add-problem" \
	-H "Content-Type: application/json" \
	-d '{
		"title": "Two Sum",
		"topic": "Array",
		"difficulty": "Easy",
		"solved": true,
		"time_taken": 15
	}'
```

### Analyze topics

```bash
curl "http://127.0.0.1:8000/analyze"
```

### Get AI suggestion

```bash
curl "http://127.0.0.1:8000/ai-suggest"
```

## Troubleshooting

### Frontend cannot connect to backend

- Make sure backend is running on port 8000.
- Frontend uses REACT_APP_API_BASE_URL if set.
- Default API base is http://127.0.0.1:8000.

### AI suggestion does not use Gemini

- Verify GEMINI_API_KEY is set in .env.
- If key is missing or Gemini fails, fallback suggestion is returned by design.

### Database reset

- Use DELETE /delete-all from API or UI Delete All Problems button.

## Notes

- CORS is currently open for development convenience.
- SQLite file preppilot.db is created automatically.
- The landing page is separate from the dashboard, so clicking Get Started opens the working app without changing the app logic.

## Copy-Paste Brief for ChatGPT

If you want to give this project to another AI later, paste this:

```text
I am working on PrepPilot, a full-stack DSA practice tracker.

Backend: FastAPI + SQLite + SQLAlchemy in main.py.
Frontend: React Create React App in preppilot-ui.
Landing page flow: LandingPage.jsx -> Get Started -> App.js dashboard.
Main features: add, edit, delete, delete-all, delete-topic, search, sort, analyze, suggest, ai-suggest.
AI behavior: Gemini is used when GEMINI_API_KEY exists; otherwise the app returns a fallback suggestion.

Important constraints:
- Do not expose secrets.
- Do not commit .env, local databases, logs, or build artifacts.
- Preserve the existing App.js dashboard unless I explicitly ask for dashboard changes.
- Keep backend route names stable unless I request a contract change.
```

## Author

Built by ArchishmanS2005.

If this project helps you, consider giving the repository a star.
