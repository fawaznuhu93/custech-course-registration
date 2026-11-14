import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Enum, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from typing import List, Optional

# --- 1. LOAD ENVIRONMENT VARIABLES ---
load_dotenv()
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "custech_registration")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- 2. MODELS ---
class StudentModel(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100))
    matric_number = Column(String(20), unique=True, index=True)
    password_hash = Column(String(255))
    department = Column(String(50))
    level = Column(Integer)
    has_registered = Column(Boolean, default=False)
    admin_message = Column(String(500), nullable=True) # NEW COLUMN
    registrations = relationship("RegistrationModel", back_populates="student", cascade="all, delete")

class CourseModel(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(15), index=True)
    course_title = Column(String(100))
    units = Column(Integer)
    semester = Column(Enum('First', 'Second'))
    department = Column(String(50))
    level = Column(Integer)
    lecturer = Column(String(100))

class RegistrationModel(Base):
    __tablename__ = "registrations"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"))
    course_code = Column(String(15)) 
    session = Column(String(10), default="2026/2027")
    student = relationship("StudentModel", back_populates="registrations")

class AdminModel(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True)
    password_hash = Column(String(255))

# --- 3. SCHEMAS ---
class StudentSignUp(BaseModel):
    full_name: str
    matric_number: str
    password: str

class StudentLogin(BaseModel):
    matric_number: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class RegistrationRequest(BaseModel):
    student_id: int
    course_codes: List[str]

class MessageRequest(BaseModel):
    student_id: int
    message: str

# --- 4. APP SETUP ---
app = FastAPI(title="CUSTECH Course Registration API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def parse_matric(matric: str):
    if len(matric) < 6: raise ValueError("Matric number too short")
    year, dept_code = matric[0:2], matric[4:6].upper()
    levels = {"23": 400, "24": 300, "25": 200, "26": 100}
    depts = {"FT": "Information Technology", "CS": "Computer Science", "SW": "Software Engineering", "CY": "Cyber Security", "LS": "Library and Information Science"}
    if year not in levels: raise ValueError("Invalid entry year")
    if dept_code not in depts: raise ValueError("Invalid department code")
    return depts[dept_code], levels[year]

# --- 5. ENDPOINTS ---

@app.post("/api/auth/signup")
def signup(student: StudentSignUp, db: Session = Depends(get_db)):
    if db.query(StudentModel).filter(StudentModel.matric_number == student.matric_number).first():
        raise HTTPException(status_code=400, detail="Matric number already registered")
    try:
        dept, level = parse_matric(student.matric_number)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    new_student = StudentModel(
        full_name=student.full_name, matric_number=student.matric_number,
        password_hash=pwd_context.hash(student.password), department=dept, level=level
    )
    db.add(new_student)
    db.commit()
    return {"message": "Sign up successful"}

@app.post("/api/auth/login")
def login(student: StudentLogin, db: Session = Depends(get_db)):
    db_student = db.query(StudentModel).filter(StudentModel.matric_number == student.matric_number).first()
    if not db_student or not pwd_context.verify(student.password, db_student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "message": "Login successful",
        "user": {"id": db_student.id, "name": db_student.full_name, "matric": db_student.matric_number,
                 "department": db_student.department, "level": db_student.level, "has_registered": db_student.has_registered,
                 "admin_message": db_student.admin_message} # INCLUDE MESSAGE
    }

@app.post("/api/auth/admin-login")
def admin_login(admin: AdminLogin, db: Session = Depends(get_db)):
    db_admin = db.query(AdminModel).filter(AdminModel.username == admin.username).first()
    if not db_admin or db_admin.password_hash != admin.password: 
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return {"message": "Admin login successful", "user": {"name": db_admin.username, "role": "admin"}}

@app.get("/api/courses")
def get_courses(department: str, level: int, semester: str, db: Session = Depends(get_db)):
    return db.query(CourseModel).filter(
        CourseModel.department == department, CourseModel.level == level, CourseModel.semester == semester
    ).all()

@app.get("/api/courses/search")
def search_courses(department: str, query: str, semester: str, db: Session = Depends(get_db)):
    return db.query(CourseModel).filter(
        CourseModel.department == department,
        CourseModel.semester == semester,
        (CourseModel.course_title.ilike(f"%{query}%")) | (CourseModel.course_code.ilike(f"%{query}%"))
    ).all()

@app.post("/api/register")
def register_courses(req: RegistrationRequest, db: Session = Depends(get_db)):
    db.query(RegistrationModel).filter(RegistrationModel.student_id == req.student_id).delete()
    
    for code in set(req.course_codes):
        db.add(RegistrationModel(student_id=req.student_id, course_code=code))
    
    student = db.query(StudentModel).filter(StudentModel.id == req.student_id).first()
    if student: student.has_registered = True
    db.commit()
    return {"message": "Registration successful"}

@app.get("/api/register/{student_id}")
def get_registered_courses(student_id: int, db: Session = Depends(get_db)):
    regs = db.query(RegistrationModel).filter(RegistrationModel.student_id == student_id).all()
    codes = list(set([r.course_code for r in regs])) 
    if not codes: return []
    
    courses = []
    for code in codes:
        c = db.query(CourseModel).filter(CourseModel.course_code == code).first()
        if c:
            courses.append(c)
    return courses

@app.get("/api/admin/registrations")
def admin_get_registrations(db: Session = Depends(get_db)):
    students = db.query(StudentModel).filter(StudentModel.has_registered == True).all()
    result = []
    for s in students:
        regs = db.query(RegistrationModel).filter(RegistrationModel.student_id == s.id).all()
        codes = list(set([r.course_code for r in regs]))
        courses = []
        for code in codes:
            c = db.query(CourseModel).filter(CourseModel.course_code == code).first()
            if c: courses.append(c)
        result.append({"id": s.id, "name": s.full_name, "matric": s.matric_number, "department": s.department, "level": s.level, "courses": courses})
    return result

@app.delete("/api/admin/registrations/{student_id}")
def admin_delete_registration(student_id: int, db: Session = Depends(get_db)):
    db.query(RegistrationModel).filter(RegistrationModel.student_id == student_id).delete()
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()
    if student: student.has_registered = False
    db.commit()
    return {"message": "Registration deleted"}

# --- NEW MESSAGE ENDPOINTS ---
@app.post("/api/admin/send-message")
def send_message(req: MessageRequest, db: Session = Depends(get_db)):
    student = db.query(StudentModel).filter(StudentModel.id == req.student_id).first()
    if student:
        student.admin_message = req.message
        db.commit()
        return {"message": "Message sent"}
    raise HTTPException(status_code=404, detail="Student not found")

@app.post("/api/student/clear-message/{student_id}")
def clear_message(student_id: int, db: Session = Depends(get_db)):
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()
    if student:
        student.admin_message = None
        db.commit()
        return {"message": "Message cleared"}
    raise HTTPException(status_code=404, detail="Student not found")