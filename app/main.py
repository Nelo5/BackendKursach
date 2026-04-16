from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from app.users import auth_router
from app.questions import questions_router
from app.tests import tests_router
from app.attempts import attempts_router
from app.answers import answers_router


# Создаем таблицы
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Online Testing System", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth_router.router)
app.include_router(tests_router.router)
app.include_router(attempts_router.router)
app.include_router(questions_router.router)
app.include_router(answers_router.router)

@app.get("/")
def root():
    return {
        "message": "Online Testing System API",
        "version": "1.0.0",
        "docs": "/docs",
        "roles": ["admin", "teacher", "student"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}