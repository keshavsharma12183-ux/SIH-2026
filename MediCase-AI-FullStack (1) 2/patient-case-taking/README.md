# MediCase AI — Full Stack (Frontend + Backend)

**SIH 2026 Prototype**  
AI-Assisted Adaptive Patient Case-Taking System

## Features

### Patient / Assistant Side
- Adaptive question flow based on chief complaint
- Structured history collection
- Optional Ayurvedic section
- Case summary + Submit to doctor

### Doctor Side
- Dashboard of all submitted cases
- View full case details
- **Custom Clinical Notes** (free text)
- **Add / Remove Medicines** (name, dosage, frequency, duration, instructions)
- Mark case as Reviewed

### Backend
- FastAPI + SQLite
- Full CRUD for cases & medicines
- CORS enabled
- Sample data seeding

---

## How to Run (Both Frontend + Backend)

### 1. Backend Start Karo

```bash
cd patient-case-taking/backend

# Virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8000
```

Backend chalega: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

### 2. Frontend Start Karo (Naya Terminal)

```bash
cd patient-case-taking

npm install
npm run dev
```

Frontend: **http://localhost:5173**

---

## Project Structure

```
patient-case-taking/
├── backend/
│   ├── main.py          ← FastAPI app
│   ├── database.py      ← SQLite models
│   └── requirements.txt
├── src/
│   ├── App.tsx          ← Full frontend
│   └── App.css
├── package.json
└── README.md
```

---

## Demo Flow for Judges

1. **Login** → Patient / Assistant
2. Fill patient details → Select **Chest Pain** or **Abdominal Pain**
3. Answer adaptive questions → Submit case
4. **Logout** → Login as **Doctor**
5. Open the case
6. Write **Clinical Notes**
7. **Add Medicines**
8. Click **Save & Mark Reviewed**

---

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Python + FastAPI
- **Database**: SQLite
- **API**: REST

---

Built for Smart India Hackathon 2026
