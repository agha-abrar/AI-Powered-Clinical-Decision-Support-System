from __future__ import annotations

import hashlib
import json
import time

from app.privacy.deidentifier import deidentify_context, SANITIZATION_VERSION
from app.prompts.diagnosis.v1 import PROMPT_TEMPLATE_VERSION
from app.schemas.diagnosis import DiagnosticRequestContext, DiagnosticResponse

DISCLAIMER = "This output is advisory and requires review by a qualified healthcare professional."


def _contains_any(haystack: list[str], needles: list[str]) -> bool:
    lowered = [h.lower() for h in haystack]
    return any(any(n in h for h in lowered) for n in needles)


class LocalDemoDiagnosisProvider:
    """A small, fully deterministic rule set covering the seeded demonstration
    scenarios (diabetes-like presentation, low-confidence autoimmune
    presentation). This is explicitly NOT a clinical model — it exists so the
    application is fully testable and usable with zero external dependency,
    and so behavior is reproducible in CI. Never confused with OpenRouter
    output: the caller always tags provider=LOCAL_DEMO on persisted rows and
    the desktop UI always shows 'Local demonstration engine used.'"""

    async def generate(self, context: DiagnosticRequestContext, correlation_id: str, fallback_reason: str | None = None) -> dict:
        start = time.monotonic()
        raw = context.model_dump(exclude_none=True)
        sanitized = deidentify_context(raw)
        input_hash = hashlib.sha256(json.dumps(sanitized, sort_keys=True, default=str).encode()).hexdigest()

        symptoms = context.symptoms or []
        positives = context.relevantPositives or []
        all_terms = symptoms + positives + [context.presentingComplaint or ""]

        diagnoses = []

        # Scenario A: diabetes-like presentation
        if _contains_any(all_terms, ["thirst", "polydipsia", "frequent urination", "polyuria", "fatigue"]):
            hba1c_elevated = any(
                lr.get("name", "").lower() in ("hba1c", "hemoglobin a1c") and _safe_float(lr.get("value")) and _safe_float(lr.get("value")) >= 6.5
                for lr in (context.labResults or [])
            )
            diagnoses.append(
                {
                    "rank": 1,
                    "conditionName": "Type 2 Diabetes Mellitus",
                    "icd10Code": "E11.9",
                    "snomedCode": "44054006",
                    "confidence": 82 if hba1c_elevated else 58,
                    "urgency": "routine",
                    "supportingEvidence": [
                        {"factor": s, "source": "symptom", "importance": 70} for s in symptoms[:3]
                    ]
                    + ([{"factor": "Elevated HbA1c", "source": "laboratory", "importance": 90}] if hba1c_elevated else []),
                    "contradictingEvidence": [],
                    "missingInformation": [] if hba1c_elevated else ["Confirmatory HbA1c or fasting glucose"],
                    "suggestedTests": [{"name": "HbA1c", "reason": "Confirm glycemic control and diagnosis"}],
                    "explanation": "Classic hyperglycemic symptom cluster (fatigue, thirst, frequent urination) supports a diabetes differential.",
                    "limitations": ["Local demonstration rule, not a calibrated clinical model."],
                }
            )

        # Scenario D: low-confidence autoimmune presentation
        if _contains_any(all_terms, ["joint pain", "joint pains", "rash", "fever", "fatigue"]) and len(diagnoses) == 0:
            for rank, (name, icd, conf) in enumerate(
                [
                    ("Systemic Lupus Erythematosus (possible)", "M32.9", 34),
                    ("Rheumatoid Arthritis (possible)", "M06.9", 29),
                    ("Viral Polyarthralgia", "B34.9", 22),
                ],
                start=1,
            ):
                diagnoses.append(
                    {
                        "rank": rank,
                        "conditionName": name,
                        "icd10Code": icd,
                        "snomedCode": None,
                        "confidence": conf,
                        "urgency": "routine",
                        "supportingEvidence": [{"factor": s, "source": "symptom", "importance": 50} for s in symptoms[:3]],
                        "contradictingEvidence": [],
                        "missingInformation": ["Autoimmune serology (ANA, RF, anti-CCP)", "Duration and pattern of joint involvement"],
                        "suggestedTests": [
                            {"name": "ANA panel", "reason": "Screen for autoimmune etiology"},
                            {"name": "RF / anti-CCP", "reason": "Evaluate for rheumatoid arthritis"},
                        ],
                        "explanation": "Nonspecific constitutional and articular symptoms with insufficient data to distinguish etiology.",
                        "limitations": ["Confidence is low; additional laboratory data is needed.", "Local demonstration rule, not a calibrated clinical model."],
                    }
                )

        if not diagnoses:
            response_payload = {
                "analysisStatus": "insufficient_data",
                "clinicalSummary": "The supplied clinical information does not match a seeded demonstration pattern.",
                "diagnoses": [],
                "redFlags": [],
                "generalLimitations": [
                    "The local demonstration engine only recognizes a small set of seeded patterns.",
                    "Configure OPENROUTER_API_KEY for general-purpose differential diagnosis.",
                ],
                "disclaimer": DISCLAIMER,
            }
        else:
            response_payload = {
                "analysisStatus": "complete",
                "clinicalSummary": f"Local demonstration analysis based on {len(symptoms)} reported symptom(s).",
                "diagnoses": diagnoses,
                "redFlags": [],
                "generalLimitations": ["Generated by the local deterministic demonstration engine, not OpenRouter."],
                "disclaimer": DISCLAIMER,
            }

        validated = DiagnosticResponse.model_validate(response_payload)
        latency_ms = int((time.monotonic() - start) * 1000)

        return {
            "response": validated,
            "provider": "LOCAL_DEMO",
            "requestedModel": None,
            "returnedModel": "local-demo-v1",
            "promptTemplateVersion": PROMPT_TEMPLATE_VERSION,
            "sanitizationVersion": SANITIZATION_VERSION,
            "inputHash": input_hash,
            "generationId": None,
            "promptTokens": None,
            "completionTokens": None,
            "totalTokens": None,
            "latencyMs": latency_ms,
            "fallbackUsed": fallback_reason is not None,
            "fallbackReason": fallback_reason,
        }


def _safe_float(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
