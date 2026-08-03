from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="AI-Powered CDSS — AI Gateway (educational prototype)",
    description="Owns de-identification, prompt construction, OpenRouter communication, and response validation.",
    version="1.0.0",
    docs_url="/api/docs",
)

# Only the NestJS backend should ever call this service. In production this
# should be restricted to the API's internal network address, not '*'.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(router)
