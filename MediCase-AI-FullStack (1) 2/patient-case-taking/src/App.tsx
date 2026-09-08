import { useState, useMemo, useEffect } from 'react'
import './App.css'

// ================== CONFIG ==================
const API_BASE = 'http://localhost:8000'

// Types
type AuthRole = 'login' | 'patient' | 'doctor'
type Step = 'details' | 'complaint' | 'questions' | 'history' | 'ayurveda' | 'summary' | 'done'

interface PatientDetails {
  name: string
  age: string
  gender: string
  phone: string
  language: string
}

interface Medicine {
  id: string | number
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
}

interface CaseData {
  id: string | number
  case_id?: string
  details: PatientDetails
  complaint: string
  answers: Record<string, string>
  history: Record<string, string>
  ayurveda: Record<string, string>
  createdAt: string
  status: 'pending' | 'reviewed'
  doctorNotes: string
  medicines: Medicine[]
}

// Adaptive questions
const QUESTION_BANK: Record<string, { id: string; text: string; type: 'single' | 'multi' | 'text'; options?: string[] }[]> = {
  'Cough': [
    { id: 'duration', text: 'How long have you had this cough?', type: 'single', options: ['Less than 3 days', '3–7 days', '1–3 weeks', 'More than 3 weeks'] },
    { id: 'type', text: 'What type of cough is it?', type: 'single', options: ['Dry cough', 'Wet / productive (with sputum)', 'Both'] },
    { id: 'sputum', text: 'If productive, what is the colour of sputum?', type: 'single', options: ['Clear / white', 'Yellow / green', 'Blood-stained', 'Not applicable'] },
    { id: 'fever', text: 'Do you have fever along with cough?', type: 'single', options: ['Yes', 'No', 'Occasionally'] },
    { id: 'breathlessness', text: 'Do you feel shortness of breath?', type: 'single', options: ['Yes, at rest', 'Yes, on exertion', 'No'] },
    { id: 'wheeze', text: 'Do you hear any whistling sound (wheeze) while breathing?', type: 'single', options: ['Yes', 'No'] },
    { id: 'chest_pain', text: 'Is there any chest pain with coughing?', type: 'single', options: ['Yes', 'No'] },
    { id: 'night', text: 'Is the cough worse at night or early morning?', type: 'single', options: ['Yes', 'No'] },
  ],
  'Chest Pain': [
    { id: 'duration', text: 'When did the chest pain start?', type: 'single', options: ['Just now / minutes ago', 'Few hours', '1–2 days', 'More than 2 days'] },
    { id: 'character', text: 'How would you describe the pain?', type: 'single', options: ['Sharp / stabbing', 'Heavy / pressure / squeezing', 'Burning', 'Dull ache'] },
    { id: 'location', text: 'Where exactly is the pain?', type: 'single', options: ['Centre of chest', 'Left side', 'Right side', 'Spreads to arm / jaw / back'] },
    { id: 'radiation', text: 'Does the pain spread anywhere else?', type: 'single', options: ['Left arm', 'Jaw / neck', 'Back', 'No radiation'] },
    { id: 'trigger', text: 'What makes the pain worse?', type: 'single', options: ['Exertion / walking', 'Deep breathing / coughing', 'Lying down', 'No clear trigger'] },
    { id: 'relief', text: 'What relieves the pain?', type: 'single', options: ['Rest', 'Antacids', 'Nothing so far', 'Medicines'] },
    { id: 'associated', text: 'Any associated symptoms?', type: 'multi', options: ['Sweating', 'Nausea / vomiting', 'Shortness of breath', 'Palpitations', 'None'] },
    { id: 'severity', text: 'On a scale of 1–10, how severe is the pain right now?', type: 'single', options: ['1–3 (mild)', '4–6 (moderate)', '7–10 (severe)'] },
  ],
  'Abdominal Pain': [
    { id: 'duration', text: 'How long have you had abdominal pain?', type: 'single', options: ['Less than 6 hours', '6–24 hours', '1–3 days', 'More than 3 days'] },
    { id: 'location', text: 'Where is the pain mainly located?', type: 'single', options: ['Upper abdomen', 'Around navel', 'Lower right', 'Lower left', 'All over'] },
    { id: 'character', text: 'What is the nature of pain?', type: 'single', options: ['Cramping / colicky', 'Constant dull', 'Sharp / stabbing', 'Burning'] },
    { id: 'severity', text: 'How severe is the pain (1–10)?', type: 'single', options: ['1–3 mild', '4–6 moderate', '7–10 severe'] },
    { id: 'associated', text: 'Associated symptoms?', type: 'multi', options: ['Nausea / vomiting', 'Diarrhoea', 'Constipation', 'Fever', 'Blood in stool', 'None'] },
    { id: 'food', text: 'Is the pain related to food?', type: 'single', options: ['Worse after eating', 'Better after eating', 'No relation'] },
    { id: 'urine', text: 'Any change in urine (burning, frequency, colour)?', type: 'single', options: ['Yes', 'No'] },
  ],
  'Fever': [
    { id: 'duration', text: 'How many days of fever?', type: 'single', options: ['1–2 days', '3–5 days', 'More than 5 days'] },
    { id: 'pattern', text: 'Fever pattern?', type: 'single', options: ['Continuous', 'Comes and goes', 'Only at night'] },
    { id: 'max_temp', text: 'Highest temperature recorded?', type: 'single', options: ['Less than 100°F', '100–102°F', 'Above 102°F', 'Not measured'] },
    { id: 'chills', text: 'Do you have chills or rigors?', type: 'single', options: ['Yes', 'No'] },
    { id: 'associated', text: 'Other symptoms?', type: 'multi', options: ['Headache', 'Body ache', 'Cough', 'Sore throat', 'Rash', 'None'] },
  ],
  'Other': [
    { id: 'main_issue', text: 'Please describe your main problem in your own words', type: 'text' },
    { id: 'duration', text: 'How long has this been going on?', type: 'single', options: ['Few hours', '1–3 days', '1 week', 'More than 1 week'] },
    { id: 'severity', text: 'How much is it affecting your daily life?', type: 'single', options: ['Mild', 'Moderate', 'Severe'] },
  ],
}

const HISTORY_FIELDS = [
  { id: 'past_illness', label: 'Past major illnesses / surgeries', placeholder: 'e.g. Diabetes, Hypertension, Appendectomy...' },
  { id: 'medicines', label: 'Current medicines (patient is already taking)', placeholder: 'Name, dose if known' },
  { id: 'allergies', label: 'Known allergies (drugs / food)', placeholder: 'e.g. Penicillin, Dust...' },
  { id: 'habits', label: 'Habits (smoking / alcohol / tobacco)', placeholder: 'Yes/No + details' },
  { id: 'family', label: 'Family history of similar illness', placeholder: 'e.g. Father has asthma' },
]

const AYURVEDA_FIELDS = [
  { id: 'prakriti', label: 'Do you know your Prakriti (body type)?', type: 'single', options: ['Vata', 'Pitta', 'Kapha', 'Mixed', 'Not sure'] },
  { id: 'digestion', label: 'How is your digestion usually?', type: 'single', options: ['Good', 'Slow / heavy', 'Irregular', 'Acidity prone'] },
  { id: 'sleep', label: 'Sleep quality', type: 'single', options: ['Sound', 'Light / disturbed', 'Difficulty falling asleep'] },
  { id: 'appetite', label: 'Appetite', type: 'single', options: ['Good', 'Variable', 'Poor'] },
  { id: 'lifestyle', label: 'Any recent lifestyle change / stress?', type: 'text' },
]

// Convert backend response to frontend CaseData
function mapBackendCase(c: any): CaseData {
  return {
    id: c.case_id || c.id,
    case_id: c.case_id,
    details: {
      name: c.patient_name,
      age: c.age,
      gender: c.gender,
      phone: c.phone || '',
      language: c.language || 'Hindi',
    },
    complaint: c.complaint,
    answers: c.answers || {},
    history: c.history || {},
    ayurveda: c.ayurveda || {},
    createdAt: c.created_at || new Date().toISOString(),
    status: c.status || 'pending',
    doctorNotes: c.doctor_notes || '',
    medicines: (c.medicines || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      duration: m.duration || '',
      instructions: m.instructions || '',
    })),
  }
}

function App() {
  const [auth, setAuth] = useState<AuthRole>('login')
  const [doctorName, setDoctorName] = useState('Sharma')
  const [step, setStep] = useState<Step>('details')
  const [details, setDetails] = useState<PatientDetails>({ name: '', age: '', gender: '', phone: '', language: 'Hindi' })
  const [complaint, setComplaint] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<Record<string, string>>({})
  const [ayurveda, setAyurveda] = useState<Record<string, string>>({})
  const [cases, setCases] = useState<CaseData[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null)
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [backendOnline, setBackendOnline] = useState(false)

  // Doctor side states
  const [doctorNotes, setDoctorNotes] = useState('')
  const [medName, setMedName] = useState('')
  const [medDosage, setMedDosage] = useState('')
  const [medFreq, setMedFreq] = useState('')
  const [medDuration, setMedDuration] = useState('')
  const [medInstructions, setMedInstructions] = useState('')

  const questions = useMemo(() => QUESTION_BANK[complaint] || [], [complaint])

  const progress = useMemo(() => {
    const steps = ['details', 'complaint', 'questions', 'history', 'ayurveda', 'summary']
    const idx = steps.indexOf(step)
    return Math.round(((idx + 1) / steps.length) * 100)
  }, [step])

  // Check backend + load cases
  useEffect(() => {
    checkBackend()
  }, [])

  useEffect(() => {
    if (auth === 'doctor') {
      loadCases()
    }
  }, [auth])

  async function checkBackend() {
    try {
      const res = await fetch(`${API_BASE}/health`)
      if (res.ok) {
        setBackendOnline(true)
        // seed sample data if empty
        await fetch(`${API_BASE}/seed`, { method: 'POST' })
      }
    } catch {
      setBackendOnline(false)
    }
  }

  async function loadCases() {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/cases`)
      if (res.ok) {
        const data = await res.json()
        setCases(data.map(mapBackendCase))
        setBackendOnline(true)
      }
    } catch (err) {
      console.error('Failed to load cases', err)
      setBackendOnline(false)
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = () => {
    const lines: string[] = []
    lines.push(`Patient: ${details.name}, ${details.age} yrs / ${details.gender}`)
    lines.push(`Chief Complaint: ${complaint}`)
    lines.push('')
    lines.push('History of Present Illness:')
    questions.forEach(q => {
      if (answers[q.id]) lines.push(`• ${q.text} → ${answers[q.id]}`)
    })
    lines.push('')
    lines.push('Past History & Habits:')
    HISTORY_FIELDS.forEach(f => {
      if (history[f.id]) lines.push(`• ${f.label}: ${history[f.id]}`)
    })
    if (Object.keys(ayurveda).length > 0) {
      lines.push('')
      lines.push('Ayurvedic / Lifestyle notes:')
      AYURVEDA_FIELDS.forEach(f => {
        if (ayurveda[f.id]) lines.push(`• ${f.label}: ${ayurveda[f.id]}`)
      })
    }
    return lines.join('\n')
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        patient_name: details.name,
        age: details.age,
        gender: details.gender,
        phone: details.phone,
        language: details.language,
        complaint,
        answers,
        history,
        ayurveda,
      }
      const res = await fetch(`${API_BASE}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setStep('done')
      } else {
        alert('Failed to submit case. Is backend running?')
      }
    } catch (err) {
      alert('Backend not reachable. Please start the backend server.')
    } finally {
      setLoading(false)
    }
  }

  const resetPatientFlow = () => {
    setDetails({ name: '', age: '', gender: '', phone: '', language: 'Hindi' })
    setComplaint('')
    setAnswers({})
    setHistory({})
    setAyurveda({})
    setCurrentQIndex(0)
    setStep('details')
  }

  const addMedicine = async () => {
    if (!selectedCase || !medName.trim()) return
    try {
      const res = await fetch(`${API_BASE}/cases/${selectedCase.id}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: medName.trim(),
          dosage: medDosage.trim(),
          frequency: medFreq.trim(),
          duration: medDuration.trim(),
          instructions: medInstructions.trim(),
        }),
      })
      if (res.ok) {
        const newMed = await res.json()
        const updated = {
          ...selectedCase,
          medicines: [...selectedCase.medicines, newMed],
        }
        setSelectedCase(updated)
        setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)))
        setMedName('')
        setMedDosage('')
        setMedFreq('')
        setMedDuration('')
        setMedInstructions('')
      }
    } catch (err) {
      alert('Failed to add medicine')
    }
  }

  const removeMedicine = async (medId: string | number) => {
    if (!selectedCase) return
    try {
      await fetch(`${API_BASE}/medicines/${medId}`, { method: 'DELETE' })
      const updated = {
        ...selectedCase,
        medicines: selectedCase.medicines.filter(m => m.id !== medId),
      }
      setSelectedCase(updated)
      setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)))
    } catch (err) {
      alert('Failed to remove medicine')
    }
  }

  const saveDoctorNotes = async (markReviewed = false) => {
    if (!selectedCase) return
    try {
      const res = await fetch(`${API_BASE}/cases/${selectedCase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_notes: doctorNotes,
          status: markReviewed ? 'reviewed' : selectedCase.status,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const updated = mapBackendCase(data)
        setSelectedCase(updated)
        setCases(prev => prev.map(c => (c.id === updated.id ? updated : c)))
        if (markReviewed) alert('Case marked as reviewed!')
      }
    } catch (err) {
      alert('Failed to save notes')
    }
  }

  // ========== RENDER ==========

  // LOGIN
  if (auth === 'login') {
    return (
      <div className="app">
        <div className="login-screen">
          <div className="login-card">
            <div className="logo-row">
              <div className="logo-icon">🩺</div>
              <div>
                <h1>MediCase AI</h1>
                <p className="tagline">AI-Assisted Adaptive Patient Case-Taking</p>
              </div>
            </div>
            <p className="login-desc">Select your role to continue</p>
            <div className="login-roles">
              <button className="role-btn doctor" onClick={() => { setDoctorName('Sharma'); setAuth('doctor') }}>
                <span className="role-emoji">👩‍⚕️</span>
                <div>
                  <strong>Doctor Login</strong>
                  <p>Review cases, write notes & prescribe medicines</p>
                </div>
              </button>
              <button className="role-btn patient" onClick={() => { resetPatientFlow(); setAuth('patient') }}>
                <span className="role-emoji">🧑‍🤝‍🧑</span>
                <div>
                  <strong>Patient / Assistant</strong>
                  <p>Fill adaptive case-taking form for a patient</p>
                </div>
              </button>
            </div>
            <p className="demo-note">
              {backendOnline ? '🟢 Backend Connected' : '🔴 Backend Offline (start backend for full features)'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // PATIENT FLOW
  if (auth === 'patient') {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand" onClick={() => setAuth('login')}>
            <span className="brand-icon">🩺</span>
            <span className="brand-name">MediCase AI</span>
          </div>
          {step !== 'done' && (
            <div className="progress-bar-wrap">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}
          <button className="btn ghost small" onClick={() => setAuth('login')}>Logout</button>
        </header>

        <main className="main-content">
          {step === 'details' && (
            <div className="step-card">
              <h2>Patient Details</h2>
              <p className="step-sub">Basic information to start the case</p>
              <div className="form-grid">
                <label>Full Name *<input value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} placeholder="Patient full name" /></label>
                <label>Age *<input type="number" value={details.age} onChange={e => setDetails({ ...details, age: e.target.value })} placeholder="Years" /></label>
                <label>Gender *
                  <select value={details.gender} onChange={e => setDetails({ ...details, gender: e.target.value })}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </label>
                <label>Phone<input value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} placeholder="Optional" /></label>
                <label className="full">Preferred Language
                  <select value={details.language} onChange={e => setDetails({ ...details, language: e.target.value })}>
                    <option>Hindi</option><option>English</option><option>Marathi</option>
                    <option>Gujarati</option><option>Tamil</option><option>Telugu</option>
                    <option>Bengali</option><option>Kannada</option>
                  </select>
                </label>
              </div>
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setAuth('login')}>← Back</button>
                <button className="btn primary" disabled={!details.name || !details.age || !details.gender} onClick={() => setStep('complaint')}>Next →</button>
              </div>
            </div>
          )}

          {step === 'complaint' && (
            <div className="step-card">
              <h2>Chief Complaint</h2>
              <p className="step-sub">What is the main reason for visit today?</p>
              <div className="complaint-grid">
                {['Cough', 'Chest Pain', 'Abdominal Pain', 'Fever', 'Other'].map(c => (
                  <button key={c} className={`complaint-card ${complaint === c ? 'selected' : ''}`}
                    onClick={() => { setComplaint(c); setAnswers({}); setCurrentQIndex(0) }}>
                    <span className="c-emoji">{c === 'Cough' ? '🫁' : c === 'Chest Pain' ? '❤️' : c === 'Abdominal Pain' ? '🩻' : c === 'Fever' ? '🌡️' : '📝'}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setStep('details')}>← Back</button>
                <button className="btn primary" disabled={!complaint} onClick={() => setStep('questions')}>Start Questions →</button>
              </div>
            </div>
          )}

          {step === 'questions' && questions.length > 0 && (() => {
            const q = questions[currentQIndex]
            const isLast = currentQIndex === questions.length - 1
            return (
              <div className="step-card">
                <div className="q-header">
                  <h2>Adaptive Questions</h2>
                  <span className="q-count">Question {currentQIndex + 1} of {questions.length}</span>
                </div>
                <p className="step-sub">Based on: <strong>{complaint}</strong></p>
                <div className="question-box">
                  <h3>{q.text}</h3>
                  {q.type === 'text' ? (
                    <textarea value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} rows={4} />
                  ) : (
                    <div className="options">
                      {q.options?.map(opt => (
                        <button key={opt} className={`option-btn ${answers[q.id] === opt ? 'selected' : ''}`}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}>{opt}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="btn-row">
                  <button className="btn secondary" onClick={() => currentQIndex === 0 ? setStep('complaint') : setCurrentQIndex(i => i - 1)}>← Back</button>
                  <button className="btn primary" disabled={!answers[q.id]} onClick={() => isLast ? setStep('history') : setCurrentQIndex(i => i + 1)}>
                    {isLast ? 'Next: History →' : 'Next →'}
                  </button>
                </div>
              </div>
            )
          })()}

          {step === 'history' && (
            <div className="step-card">
              <h2>Past History & Habits</h2>
              <div className="form-stack">
                {HISTORY_FIELDS.map(f => (
                  <label key={f.id}>{f.label}
                    <textarea value={history[f.id] || ''} onChange={e => setHistory({ ...history, [f.id]: e.target.value })} placeholder={f.placeholder} rows={2} />
                  </label>
                ))}
              </div>
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setStep('questions')}>← Back</button>
                <button className="btn primary" onClick={() => setStep('ayurveda')}>Next →</button>
              </div>
            </div>
          )}

          {step === 'ayurveda' && (
            <div className="step-card">
              <h2>Ayurvedic Perspective <span className="optional-badge">Optional</span></h2>
              <div className="form-stack">
                {AYURVEDA_FIELDS.map(f => (
                  <div key={f.id}>
                    <label>{f.label}</label>
                    {f.type === 'text' ? (
                      <textarea value={ayurveda[f.id] || ''} onChange={e => setAyurveda({ ...ayurveda, [f.id]: e.target.value })} rows={2} />
                    ) : (
                      <div className="options compact">
                        {f.options?.map(opt => (
                          <button key={opt} className={`option-btn ${ayurveda[f.id] === opt ? 'selected' : ''}`}
                            onClick={() => setAyurveda({ ...ayurveda, [f.id]: opt })}>{opt}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setStep('history')}>← Back</button>
                <button className="btn ghost" onClick={() => setStep('summary')}>Skip</button>
                <button className="btn primary" onClick={() => setStep('summary')}>Generate Summary →</button>
              </div>
            </div>
          )}

          {step === 'summary' && (
            <div className="step-card">
              <h2>Case Summary</h2>
              <p className="step-sub">Review before submitting to the doctor.</p>
              <pre className="summary-box">{generateSummary()}</pre>
              <div className="btn-row">
                <button className="btn secondary" onClick={() => setStep('ayurveda')}>← Edit</button>
                <button className="btn primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Case to Doctor →'}
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="step-card centered">
              <div className="success-icon">✅</div>
              <h2>Case Submitted Successfully!</h2>
              <p className="step-sub">Structured history has been sent to the doctor dashboard.</p>
              <div className="btn-row center">
                <button className="btn primary" onClick={() => { resetPatientFlow(); setAuth('login') }}>Back to Login</button>
                <button className="btn secondary" onClick={() => { resetPatientFlow(); setStep('details') }}>Take Another Case</button>
              </div>
            </div>
          )}
        </main>
        <footer className="footer">
          <span>SIH 2026 • MediCase AI</span>
          <span>{backendOnline ? '🟢 Backend Connected' : '🔴 Backend Offline'}</span>
        </footer>
      </div>
    )
  }

  // DOCTOR MODE
  if (auth === 'doctor') {
    if (selectedCase) {
      return (
        <div className="app">
          <header className="topbar">
            <div className="brand" onClick={() => setSelectedCase(null)}>
              <span className="brand-icon">🩺</span>
              <span className="brand-name">MediCase AI</span>
            </div>
            <span className="doctor-welcome">Dr. {doctorName}</span>
            <button className="btn ghost small" onClick={() => { setSelectedCase(null); setAuth('login') }}>Logout</button>
          </header>

          <div className="doctor-layout">
            <aside className="sidebar">
              <button className="back-link" onClick={() => setSelectedCase(null)}>← All Cases</button>
              <h3>{selectedCase.details.name}</h3>
              <p className="meta">{selectedCase.details.age} yrs • {selectedCase.details.gender}</p>
              <p className="meta">{selectedCase.complaint}</p>
              <span className={`status-badge ${selectedCase.status}`}>{selectedCase.status}</span>
            </aside>

            <main className="case-detail">
              <div className="detail-header">
                <h2>Case {selectedCase.id}</h2>
              </div>

              <section>
                <h3>Patient Details</h3>
                <div className="info-grid">
                  <div><span>Name</span><strong>{selectedCase.details.name}</strong></div>
                  <div><span>Age / Gender</span><strong>{selectedCase.details.age} / {selectedCase.details.gender}</strong></div>
                  <div><span>Phone</span><strong>{selectedCase.details.phone || '—'}</strong></div>
                  <div><span>Language</span><strong>{selectedCase.details.language}</strong></div>
                </div>
              </section>

              <section>
                <h3>Chief Complaint & Answers</h3>
                <p className="complaint-tag">{selectedCase.complaint}</p>
                <div className="answer-list">
                  {Object.entries(selectedCase.answers).map(([k, v]) => (
                    <div key={k} className="answer-row">
                      <span className="q-key">{k.replace(/_/g, ' ')}</span>
                      <span className="q-val">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>Past History</h3>
                <div className="answer-list">
                  {Object.entries(selectedCase.history).map(([k, v]) => v && (
                    <div key={k} className="answer-row">
                      <span className="q-key">{k.replace(/_/g, ' ')}</span>
                      <span className="q-val">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Doctor Notes */}
              <section className="doctor-notes-section">
                <h3>📝 Doctor's Clinical Notes / Prescription</h3>
                <p className="section-hint">Write your own notes, diagnosis or prescription here.</p>
                <textarea
                  className="doctor-notes-area"
                  value={doctorNotes}
                  onChange={e => setDoctorNotes(e.target.value)}
                  placeholder="Write clinical notes, provisional diagnosis, advice..."
                  rows={6}
                />
                <button className="btn primary small" onClick={() => saveDoctorNotes(false)} style={{ marginTop: 10 }}>
                  Save Notes
                </button>
              </section>

              {/* Medicines */}
              <section className="medicines-section">
                <h3>💊 Prescribed Medicines</h3>
                <p className="section-hint">Add medicines according to your clinical judgment.</p>

                {selectedCase.medicines.length > 0 && (
                  <div className="med-list">
                    {selectedCase.medicines.map(med => (
                      <div key={med.id} className="med-card">
                        <div className="med-info">
                          <strong>{med.name}</strong>
                          <span>{med.dosage} • {med.frequency} • {med.duration}</span>
                          {med.instructions && <small>{med.instructions}</small>}
                        </div>
                        <button className="btn-remove" onClick={() => removeMedicine(med.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-med-form">
                  <div className="form-grid med-grid">
                    <label>Medicine Name *<input value={medName} onChange={e => setMedName(e.target.value)} placeholder="e.g. Amoxicillin 500mg" /></label>
                    <label>Dosage<input value={medDosage} onChange={e => setMedDosage(e.target.value)} placeholder="e.g. 1 tablet" /></label>
                    <label>Frequency<input value={medFreq} onChange={e => setMedFreq(e.target.value)} placeholder="e.g. Twice daily" /></label>
                    <label>Duration<input value={medDuration} onChange={e => setMedDuration(e.target.value)} placeholder="e.g. 5 days" /></label>
                    <label className="full">Special Instructions
                      <input value={medInstructions} onChange={e => setMedInstructions(e.target.value)} placeholder="e.g. After food" />
                    </label>
                  </div>
                  <button className="btn primary" onClick={addMedicine} disabled={!medName.trim()}>+ Add Medicine</button>
                </div>
              </section>

              <div className="doctor-actions">
                <button className="btn primary" onClick={() => saveDoctorNotes(true)}>
                  Save & Mark Reviewed
                </button>
              </div>
            </main>
          </div>
        </div>
      )
    }

    // Dashboard
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-icon">🩺</span>
            <span className="brand-name">MediCase AI</span>
          </div>
          <span className="doctor-welcome">Welcome, Dr. {doctorName}</span>
          <button className="btn ghost small" onClick={() => setAuth('login')}>Logout</button>
        </header>

        <div className="doctor-layout">
          <aside className="sidebar">
            <div className="logo-mini">🩺 MediCase</div>
            <h3>Doctor Dashboard</h3>
            <p className="meta">{cases.filter(c => c.status === 'pending').length} pending cases</p>
            <button className="btn secondary full" onClick={loadCases} style={{ marginTop: 12 }}>
              🔄 Refresh
            </button>
            <button className="btn secondary full" onClick={() => setAuth('login')} style={{ marginTop: 8 }}>← Logout</button>
          </aside>

          <main className="case-list">
            <h2>Submitted Cases {loading && <small>(Loading...)</small>}</h2>
            {!backendOnline && (
              <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                ⚠️ Backend offline. Start the backend server to see real data.
              </div>
            )}
            <div className="cases-grid">
              {cases.length === 0 && !loading && <p>No cases yet. Submit a case from Patient mode.</p>}
              {cases.map(c => (
                <button key={c.id} className="case-card" onClick={() => {
                  setSelectedCase(c)
                  setDoctorNotes(c.doctorNotes || '')
                }}>
                  <div className="case-top">
                    <strong>{c.details.name}</strong>
                    <span className={`status-badge ${c.status}`}>{c.status}</span>
                  </div>
                  <p>{c.details.age} yrs • {c.complaint}</p>
                  <span className="time">{new Date(c.createdAt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return null
}

export default App
