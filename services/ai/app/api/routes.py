from __future__ import annotations

import uuid

from fastapi import APIRouter, Header, HTTPException

from app.schemas.diagnosis import DiagnosisAnalyzeRequest, DiagnosisAnalyzeResponse
from app.services.diagnosis_service import ProviderUnavailableError, run_diagnostic_analysis

router = APIRouter(prefix="/api/v1")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/diagnosis/analyze", response_model=DiagnosisAnalyzeResponse)
async def analyze_diagnosis(payload: DiagnosisAnalyzeRequest, x_correlation_id: str | None = Header(default=None)):
    correlation_id = x_correlation_id or str(uuid.uuid4())
    try:
        result = await run_diagnostic_analysis(payload.context, correlation_id)
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"error": {"code": exc.code, "message": exc.message}}) from exc
    return DiagnosisAnalyzeResponse(**result)
