from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import auth_router, tests_router, attempts_router, admin_router

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
app.include_router(admin_router.router)

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