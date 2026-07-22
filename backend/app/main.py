from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.exceptions import register_exception_handlers
from app.routers import assets, auth, lots, reports, sales

app = FastAPI(title="FIFO Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(lots.router)
app.include_router(sales.router)
app.include_router(reports.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
