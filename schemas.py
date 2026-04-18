# Import Pydantic base model and validator
from pydantic import BaseModel, field_validator


# Allowed difficulty values
ALLOWED_DIFFICULTY = ["Easy", "Medium", "Hard"]


# This schema validates input data coming from user
class Problem(BaseModel):
    # Problem title
    title: str

    # Problem topic
    topic: str

    # Difficulty level
    difficulty: str

    # Solved or not
    solved: bool

    # Time taken in minutes
    time_taken: int


    # -------- VALIDATIONS -------- #

    # Validate difficulty field
    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, value):
        if value not in ALLOWED_DIFFICULTY:
            raise ValueError("Difficulty must be Easy, Medium, or Hard")
        return value


    # Validate title (must not be empty or only spaces)
    @field_validator("title")
    @classmethod
    def validate_title(cls, value):
        if not value.strip():
            raise ValueError("Title cannot be empty")
        return value.strip()


    # Validate topic (must not be empty or only spaces)
    @field_validator("topic")
    @classmethod
    def validate_topic(cls, value):
        if not value.strip():
            raise ValueError("Topic cannot be empty")
        return value.strip()


    # Validate time_taken (must be >= 0)
    @field_validator("time_taken")
    @classmethod
    def validate_time(cls, value):
        if value < 0:
            raise ValueError("Time taken must be 0 or more")
        return value