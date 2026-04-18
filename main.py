# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Used to access environment variables like GEMINI_API_KEY
import os

import logging

# FastAPI tools
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# SQLAlchemy query helpers
from sqlalchemy import func, case, or_

# Import database session and engine
from database import SessionLocal, engine

# Import database table model
from models import Base, ProblemTable

# Import input validation schema
from schemas import Problem

# Gemini AI library
try:
    from google import genai
except ImportError:
    genai = None


# Configure logging
logging.basicConfig(
    level=logging.INFO,  # INFO, WARNING, ERROR
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# Standard success response
def success_response(message: str, data=None):
    return {
        "status": "success",
        "message": message,
        "data": data
    }


# Standard error response
def error_response(message: str):
    return {
        "status": "error",
        "message": message
    }


# Create FastAPI app
app = FastAPI()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": error_response("Validation failed")}
    )

# Allowed sort values
ALLOWED_SORT = ["time", "difficulty"]


# Create database tables when app starts
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


# Convert database object into dictionary so FastAPI can return clean JSON
def problem_to_dict(problem):
    return {
        "id": problem.id,
        "title": problem.title,
        "topic": problem.topic,
        "difficulty": problem.difficulty,
        "solved": problem.solved,
        "time_taken": problem.time_taken
    }


# Safely extract text from Gemini response
def extract_gemini_text(response) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text

    candidates = getattr(response, "candidates", None)
    if not candidates:
        return "AI response error"

    first_candidate = candidates[0] if len(candidates) > 0 else None
    if first_candidate is None:
        return "AI response error"

    content = getattr(first_candidate, "content", None)
    if content is None:
        return "AI response error"

    parts = getattr(content, "parts", None)
    if not parts:
        return "AI response error"

    first_part = parts[0] if len(parts) > 0 else None
    if first_part is None:
        return "AI response error"

    nested_text = getattr(first_part, "text", None)
    if isinstance(nested_text, str) and nested_text.strip():
        return nested_text

    return "AI response error"


# Get topic statistics using database aggregation
def get_topic_stats(db):
    rows = (
        db.query(
            ProblemTable.topic.label("topic"),
            func.count(ProblemTable.id).label("total_count"),
            func.sum(
                case(
                    (ProblemTable.solved == False, 1),
                    else_=0
                )
            ).label("unsolved_count")
        )
        .group_by(ProblemTable.topic)
        .all()
    )

    topic_count = {}
    unsolved_count = {}

    for row in rows:
        topic_count[row.topic] = row.total_count
        unsolved_count[row.topic] = row.unsolved_count or 0

    return topic_count, unsolved_count


# Home route
@app.get("/")
def home():
    return success_response("PrepPilot API is running cleanly")


# Add a new problem into database
@app.post("/add-problem")
def add_problem(problem: Problem):
    db = SessionLocal()

    try:
        new_problem = ProblemTable(**problem.dict())

        db.add(new_problem)
        db.commit()
        db.refresh(new_problem)

        logger.info(f"New problem added: {problem.title}")

        return success_response(
            "Problem added successfully",
            problem_to_dict(new_problem)
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Error adding problem: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=error_response("Internal server error")
        )

    finally:
        db.close()


# Get all problems from database
@app.get("/problems")
def get_problems(page: int = 1, limit: int = 5):
    db = SessionLocal()

    try:
        logger.info(f"Fetching problems | page={page}, limit={limit}")

        # Validate input
        if page < 1 or limit < 1:
            raise HTTPException(
                status_code=400,
                detail=error_response("Page and limit must be greater than 0")
            )

        # Calculate offset (how many rows to skip)
        offset = (page - 1) * limit

        # Fetch only required rows from DB
        problems = (
            db.query(ProblemTable)
            .offset(offset)
            .limit(limit)
            .all()
        )

        # Total count (for frontend info)
        total = db.query(ProblemTable).count()

        return success_response(
            "Problems fetched successfully",
            {
                "page": page,
                "limit": limit,
                "total": total,
                "problems": [problem_to_dict(problem) for problem in problems]
            }
        )

    finally:
        db.close()


# Search problems directly in database
@app.get("/search")
def search_problems(keyword: str = Query(...)):
    db = SessionLocal()

    try:
        search_pattern = f"%{keyword}%"

        problems = (
            db.query(ProblemTable)
            .filter(
                or_(
                    ProblemTable.title.ilike(search_pattern),
                    ProblemTable.topic.ilike(search_pattern)
                )
            )
            .all()
        )

        return success_response(
            "Search completed successfully",
            {
                "keyword": keyword,
                "total_found": len(problems),
                "results": [problem_to_dict(problem) for problem in problems]
            }
        )

    finally:
        db.close()


# Sort problems directly in database
@app.get("/sort")
def sort_problems(by: str):
    if by not in ALLOWED_SORT:
        logger.error("Invalid sort type used")
        raise HTTPException(
            status_code=400,
            detail=error_response("Invalid sort type. Use 'time' or 'difficulty'")
        )

    db = SessionLocal()

    try:
        if by == "time":
            problems = (
                db.query(ProblemTable)
                .order_by(ProblemTable.time_taken.asc())
                .all()
            )

        else:
            # Safe difficulty ordering
            difficulty_order = case(
                (ProblemTable.difficulty == "Easy", 1),
                (ProblemTable.difficulty == "Medium", 2),
                (ProblemTable.difficulty == "Hard", 3),
                else_=99
            )

            problems = (
                db.query(ProblemTable)
                .order_by(difficulty_order.asc(), ProblemTable.id.asc())
                .all()
            )

        return success_response(
            "Problems sorted successfully",
            {
                "sorted_by": by,
                "problems": [problem_to_dict(problem) for problem in problems]
            }
        )

    finally:
        db.close()


# Analyze weak topics using database aggregation
@app.get("/analyze")
def analyze_topics():
    db = SessionLocal()

    try:
        topic_count, _ = get_topic_stats(db)

        if not topic_count:
            return success_response(
                "No data available",
                {
                    "topic_count": {},
                    "minimum_count": 0,
                    "weak_topics": []
                }
            )

        min_count = min(topic_count.values())

        weak_topics = [
            topic for topic, count in topic_count.items()
            if count == min_count
        ]

        return success_response(
            "Topic analysis completed successfully",
            {
                "topic_count": topic_count,
                "minimum_count": min_count,
                "weak_topics": weak_topics
            }
        )

    finally:
        db.close()


# Suggest next practice topic using rule-based logic
@app.get("/suggest")
def suggest_practice():
    db = SessionLocal()

    try:
        topic_count, unsolved_count = get_topic_stats(db)

        if not topic_count:
            return success_response(
                "No data available",
                {
                    "weakest_topics": [],
                    "suggestion": "No data available."
                }
            )

        min_count = min(topic_count.values())

        weakest_topics = [
            topic for topic, count in topic_count.items()
            if count == min_count
        ]

        prioritized_topic = max(
            weakest_topics,
            key=lambda topic: unsolved_count.get(topic, 0)
        )

        if len(weakest_topics) == 1:
            suggestion = f"Focus on {prioritized_topic}. Solve 2 problems from this topic."
        else:
            suggestion = f"Weak topics: {', '.join(weakest_topics)}. Start with {prioritized_topic}."

        return success_response(
            "Suggestion generated successfully",
            {
                "weakest_topics": weakest_topics,
                "prioritized_topic": prioritized_topic,
                "topic_count": topic_count,
                "unsolved_count": unsolved_count,
                "suggestion": suggestion
            }
        )

    finally:
        db.close()


# AI suggestion using Gemini with fallback
@app.get("/ai-suggest")
def ai_suggest():
    db = SessionLocal()

    try:
        topic_count, unsolved_count = get_topic_stats(db)

        if not topic_count:
            return success_response(
                "No data available",
                {
                    "ai_suggestion": "No data available."
                }
            )

        min_count = min(topic_count.values())

        weakest_topics = [
            topic for topic, count in topic_count.items()
            if count == min_count
        ]

        prioritized_topic = max(
            weakest_topics,
            key=lambda topic: unsolved_count.get(topic, 0)
        )

        fallback = f"Focus on {prioritized_topic}. Solve 2 problems from this topic."

        if genai is None:
            logger.warning("AI failed, using fallback suggestion")
            return success_response(
                "Fallback suggestion generated successfully",
                {
                    "weakest_topics": weakest_topics,
                    "prioritized_topic": prioritized_topic,
                    "ai_suggestion": fallback
                }
            )

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("AI failed, using fallback suggestion")
            return success_response(
                "Fallback suggestion generated successfully",
                {
                    "weakest_topics": weakest_topics,
                    "prioritized_topic": prioritized_topic,
                    "ai_suggestion": fallback
                }
            )

        prompt = f"""
You are a strict DSA coach.

Data:
- Weakest topics: {weakest_topics}
- Topic counts: {topic_count}
- Unsolved counts: {unsolved_count}
- Priority topic: {prioritized_topic}

Rules:
1. ONLY talk about weakest topics.
2. Do NOT mention any other topic.
3. First line must focus on prioritized topic.
4. Suggest exactly 2-3 problems to solve.
5. Keep output under 60 words.
6. Be clear and direct.
7. Be supportive and professional. Do not use harsh language.

Format:
Focus: <topic>
Practice: <what to study>
Next: <exact action>
"""

        try:
            client = genai.Client(api_key=api_key)

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            clean_text = extract_gemini_text(response).replace("**", "")

            return success_response(
                "AI suggestion generated successfully",
                {
                    "weakest_topics": weakest_topics,
                    "prioritized_topic": prioritized_topic,
                    "ai_suggestion": clean_text
                }
            )

        except Exception as e:
            logger.warning(f"AI failed: {str(e)}")
            return success_response(
                "Fallback suggestion generated",
                {
                    "weakest_topics": weakest_topics,
                    "prioritized_topic": prioritized_topic,
                    "ai_suggestion": fallback
                }
            )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error generating AI suggestion: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=error_response("Internal server error")
        )

    finally:
        db.close()


# Update one problem by id
@app.put("/update-problem/{problem_id}")
def update_problem(problem_id: int, updated_problem: Problem):
    db = SessionLocal()

    try:
        problem = db.query(ProblemTable).filter(ProblemTable.id == problem_id).first()

        if not problem:
            raise HTTPException(
                status_code=404,
                detail=error_response("Problem not found")
            )

        problem.title = updated_problem.title
        problem.topic = updated_problem.topic
        problem.difficulty = updated_problem.difficulty
        problem.solved = updated_problem.solved
        problem.time_taken = updated_problem.time_taken

        db.commit()
        db.refresh(problem)

        return success_response(
            f"Problem with id {problem_id} updated successfully",
            problem_to_dict(problem)
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.error(f"Error updating problem {problem_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=error_response("Internal server error")
        )

    finally:
        db.close()


# Delete one problem by id
@app.delete("/delete-problem/{problem_id}")
def delete_problem(problem_id: int):
    db = SessionLocal()

    try:
        problem = db.query(ProblemTable).filter(ProblemTable.id == problem_id).first()

        if not problem:
            raise HTTPException(
                status_code=404,
                detail=error_response("Problem not found")
            )

        logger.warning(f"Deleting problem with id: {problem_id}")
        db.delete(problem)
        db.commit()

        return success_response(
            f"Problem with id {problem_id} deleted successfully"
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting problem {problem_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=error_response("Internal server error")
        )

    finally:
        db.close()


# Delete all problems whose topic contains the given text
@app.delete("/delete-topic/{topic}")
def delete_topic(topic: str):
    db = SessionLocal()

    try:
        deleted_count = (
            db.query(ProblemTable)
            .filter(func.lower(ProblemTable.topic) == topic.lower())
            .delete(synchronize_session=False)
        )

        if deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail=error_response("Topic not found")
            )

        db.commit()

        return success_response(
            f"Problems matching topic '{topic}' deleted successfully",
            {
                "deleted_count": deleted_count
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting topic '{topic}': {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=error_response("Internal server error")
        )

    finally:
        db.close()