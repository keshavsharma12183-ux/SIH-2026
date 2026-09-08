from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime

from database import init_db, get_db, Case, Medicine

app = FastAPI(
    title="MediCase AI Backend",
    description="AI-Assisted Adaptive Patient Case-Taking System - Backend API",
    version="1.0.0"
)

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo. In production restrict this.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== Pydantic Schemas ==========

class MedicineCreate(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""


class MedicineOut(BaseModel):
    id: int
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    patient_name: str
    age: str
    gender: str
    phone: Optional[str] = None
    language: str = "Hindi"
    complaint: str
    answers: dict = {}
    history: dict = {}
    ayurveda: dict = {}


class CaseUpdate(BaseModel):
    doctor_notes: Optional[str] = None
    status: Optional[str] = None
    medicines: Optional[List[MedicineCreate]] = None


class CaseOut(BaseModel):
    id: int
    case_id: str
    patient_name: str
    age: str
    gender: str
    phone: Optional[str]
    language: str
    complaint: str
    answers: dict
    history: dict
    ayurveda: dict
    doctor_notes: str
    status: str
    created_at: datetime
    medicines: List[MedicineOut] = []

    class Config:
        from_attributes = True


# ========== Startup ==========

@app.on_event("startup")
def on_startup():
    init_db()
    print("✅ Database initialized")


# ========== Helper ==========

def case_to_dict(case: Case) -> dict:
    return {
        "id": case.id,
        "case_id": case.case_id,
        "patient_name": case.patient_name,
        "age": case.age,
        "gender": case.gender,
        "phone": case.phone,
        "language": case.language,
        "complaint": case.complaint,
        "answers": json.loads(case.answers) if case.answers else {},
        "history": json.loads(case.history) if case.history else {},
        "ayurveda": json.loads(case.ayurveda) if case.ayurveda else {},
        "doctor_notes": case.doctor_notes or "",
        "status": case.status,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "medicines": [
            {
                "id": m.id,
                "name": m.name,
                "dosage": m.dosage,
                "frequency": m.frequency,
                "duration": m.duration,
                "instructions": m.instructions,
            }
            for m in case.medicines
        ],
    }


# ========== API Routes ==========

@app.get("/")
def root():
    return {
        "message": "MediCase AI Backend is running 🩺",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# Create a new case (Patient side)
@app.post("/cases", response_model=dict)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    # Generate case_id
    count = db.query(Case).count()
    case_id = f"CASE-{1001 + count}"

    new_case = Case(
        case_id=case_id,
        patient_name=payload.patient_name,
        age=payload.age,
        gender=payload.gender,
        phone=payload.phone,
        language=payload.language,
        complaint=payload.complaint,
        answers=json.dumps(payload.answers),
        history=json.dumps(payload.history),
        ayurveda=json.dumps(payload.ayurveda),
        doctor_notes="",
        status="pending",
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return case_to_dict(new_case)


# Get all cases (Doctor dashboard)
@app.get("/cases")
def get_all_cases(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Case).order_by(Case.created_at.desc())
    if status:
        query = query.filter(Case.status == status)
    cases = query.all()
    return [case_to_dict(c) for c in cases]


# Get single case
@app.get("/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        # Also try by integer id
        try:
            case = db.query(Case).filter(Case.id == int(case_id)).first()
        except:
            pass
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case_to_dict(case)


# Update case (Doctor notes + status + medicines)
@app.put("/cases/{case_id}")
def update_case(case_id: str, payload: CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        try:
            case = db.query(Case).filter(Case.id == int(case_id)).first()
        except:
            pass
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if payload.doctor_notes is not None:
        case.doctor_notes = payload.doctor_notes
    if payload.status is not None:
        case.status = payload.status

    # Replace medicines if provided
    if payload.medicines is not None:
        # Delete old medicines
        db.query(Medicine).filter(Medicine.case_id == case.id).delete()
        # Add new ones
        for med in payload.medicines:
            new_med = Medicine(
                case_id=case.id,
                name=med.name,
                dosage=med.dosage,
                frequency=med.frequency,
                duration=med.duration,
                instructions=med.instructions,
            )
            db.add(new_med)

    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return case_to_dict(case)


# Add a single medicine to a case
@app.post("/cases/{case_id}/medicines")
def add_medicine(case_id: str, med: MedicineCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        try:
            case = db.query(Case).filter(Case.id == int(case_id)).first()
        except:
            pass
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    new_med = Medicine(
        case_id=case.id,
        name=med.name,
        dosage=med.dosage,
        frequency=med.frequency,
        duration=med.duration,
        instructions=med.instructions,
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return {
        "id": new_med.id,
        "name": new_med.name,
        "dosage": new_med.dosage,
        "frequency": new_med.frequency,
        "duration": new_med.duration,
        "instructions": new_med.instructions,
    }


# Delete a medicine
@app.delete("/medicines/{medicine_id}")
def delete_medicine(medicine_id: int, db: Session = Depends(get_db)):
    med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    db.delete(med)
    db.commit()
    return {"message": "Medicine deleted"}


# Simple seed data for demo
@app.post("/seed")
def seed_data(db: Session = Depends(get_db)):
    existing = db.query(Case).count()
    if existing > 0:
        return {"message": "Database already has data"}

    sample1 = Case(
        case_id="CASE-1001",
        patient_name="Rahul Sharma",
        age="34",
        gender="Male",
        phone="98XXXXXX21",
        language="Hindi",
        complaint="Cough",
        answers=json.dumps({
            "duration": "1–3 weeks",
            "type": "Wet / productive (with sputum)",
            "sputum": "Yellow / green",
            "fever": "Yes",
            "breathlessness": "Yes, on exertion"
        }),
        history=json.dumps({
            "past_illness": "None",
            "medicines": "None",
            "allergies": "None",
            "habits": "Occasional smoking",
            "family": "Father has COPD"
        }),
        ayurveda=json.dumps({}),
        status="pending",
    )
    sample2 = Case(
        case_id="CASE-1002",
        patient_name="Priya Patel",
        age="28",
        gender="Female",
        phone="97XXXXXX45",
        language="Gujarati",
        complaint="Abdominal Pain",
        answers=json.dumps({
            "duration": "6–24 hours",
            "location": "Lower right",
            "character": "Sharp / stabbing",
            "severity": "7–10 severe",
            "associated": "Nausea / vomiting, Fever"
        }),
        history=json.dumps({
            "past_illness": "None",
            "medicines": "None",
            "allergies": "None",
            "habits": "None",
            "family": "None"
        }),
        ayurveda=json.dumps({}),
        status="pending",
    )
    db.add(sample1)
    db.add(sample2)
    db.commit()
    return {"message": "Sample data added successfully"}
