# 🚀 PrepPilot — DSA + AI Practice Tracker

## 📌 Overview
PrepPilot is a backend-focused system that helps track DSA problems and uses AI to suggest what to practice next based on weak areas.

It combines **DSA logic + backend development + AI integration** to create a smart practice tracking system.

---

## ❗ Problem Statement
Most students solve coding problems randomly without tracking:
- weak topics
- time spent
- consistency

There is no structured way to analyze performance.

---

## 💡 Solution
PrepPilot allows users to:
- store problems
- analyze topic-wise performance
- identify weak areas
- get AI-based suggestions for improvement

---

## ⚙️ Features

### Core Features
- Add coding problems
- View all problems (with pagination)
- Update problems
- Delete problems
- Delete by topic

### DSA Integration
- Search (Linear search logic)
- Sort (Custom sorting logic)
- Analyze weak topics (HashMap logic)

### AI Features
- AI-based suggestion using Gemini
- Fallback suggestion if AI fails

### Backend Enhancements
- Input validation (Pydantic)
- Standard API response format
- Logging (INFO / ERROR / WARNING)
- Error handling (clean structured responses)
- Pagination (page & limit)

---

## 🧠 Tech Stack

- Backend: FastAPI
- Language: Python
- Database: SQLite + SQLAlchemy
- AI: Gemini API
- Validation: Pydantic

---

## 📡 API Endpoints
