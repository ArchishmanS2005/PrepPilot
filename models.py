# Import column types for database table
from sqlalchemy import Column, Integer, String, Boolean

# Import Base from database.py
from database import Base


# This class creates the "problems" table in SQLite
class ProblemTable(Base):
    # Table name in database
    __tablename__ = "problems"

    # Unique id for each problem
    id = Column(Integer, primary_key=True, index=True)

    # Problem title
    title = Column(String, nullable=False)

    # Topic like Array, Tree, Graph
    topic = Column(String, nullable=False)

    # Difficulty like Easy, Medium, Hard
    difficulty = Column(String, nullable=False)

    # Solved status: True or False
    solved = Column(Boolean, nullable=False)

    # Time taken in minutes
    time_taken = Column(Integer, nullable=False)