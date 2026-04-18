# Import SQLAlchemy tools needed to create database connection
from sqlalchemy import create_engine

# Import tools to create DB sessions and base model class
from sqlalchemy.orm import sessionmaker, declarative_base


# SQLite database file path
# This creates/uses a file named preppilot.db in the current folder
DATABASE_URL = "sqlite:///./preppilot.db"


# Create database engine
# check_same_thread=False is needed for SQLite with FastAPI
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


# Create session factory
# SessionLocal() will be used to talk to the database
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# Base class for all database table models
Base = declarative_base()