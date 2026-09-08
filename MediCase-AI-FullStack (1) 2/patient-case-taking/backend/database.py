from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./medcase.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True)  # e.g. CASE-1001
    patient_name = Column(String, nullable=False)
    age = Column(String)
    gender = Column(String)
    phone = Column(String, nullable=True)
    language = Column(String, default="Hindi")
    complaint = Column(String, nullable=False)
    answers = Column(Text)          # JSON string
    history = Column(Text)          # JSON string
    ayurveda = Column(Text)         # JSON string
    doctor_notes = Column(Text, default="")
    status = Column(String, default="pending")  # pending / reviewed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    medicines = relationship("Medicine", back_populates="case", cascade="all, delete-orphan")


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    name = Column(String, nullable=False)
    dosage = Column(String, default="")
    frequency = Column(String, default="")
    duration = Column(String, default="")
    instructions = Column(String, default="")

    case = relationship("Case", back_populates="medicines")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
