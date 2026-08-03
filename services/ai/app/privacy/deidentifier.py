"""
De-identifies clinical context before it may ever leave the process boundary
toward OpenRouter. This module is deliberately conservative: it only ever
*removes* fields it doesn't recognize as clinically relevant, never adds
inferred data.

SANITIZATION_VERSION is bumped whenever the rules below change, so every
DiagnosticRun records exactly which version processed its input.
"""
from __future__ import annotations

from typing import Any

SANITIZATION_VERSION = "v1"

# Fields that must never reach the provider under any circumstance.
_FORBIDDEN_KEYS = {
    "patientName",
    "firstName",
    "lastName",
    "middleName",
    "medicalRecordNumber",
    "email",
    "phone",
    "address",
    "nationalId",
    "insuranceId",
    "encounterId",
    "userId",
    "clinicianName",
    "clinicianId",
}

# Fields that are allowed through as-is because they were already reduced to
# clinically relevant, non-identifying values by the caller (NestJS).
_ALLOWED_KEYS = {
    "ageOrRange",
    "sexAtBirth",
    "pregnancyStatus",
    "presentingComplaint",
    "symptoms",
    "symptomDuration",
    "relevantPositives",
    "relevantNegatives",
    "vitals",
    "medicalHistory",
    "familyHistory",
    "currentMedications",
    "allergies",
    "labResults",
    "approvedNlpEntities",
    "previousRelevantDiagnoses",
    "renalInformation",
    "hepaticInformation",
    "clinicianQuestion",
}


def deidentify_context(raw_context: dict[str, Any]) -> dict[str, Any]:
    """Returns a new dict containing only the allow-listed, non-identifying
    clinical fields. Anything not explicitly allow-listed is dropped rather
    than passed through, which is the safer failure direction."""
    cleaned: dict[str, Any] = {}
    for key, value in raw_context.items():
        if key in _FORBIDDEN_KEYS:
            continue
        if key not in _ALLOWED_KEYS:
            continue
        cleaned[key] = value
    return cleaned


def contains_forbidden_keys(context: dict[str, Any]) -> list[str]:
    """Defense-in-depth check used in tests and at request time: asserts the
    caller didn't accidentally include a direct identifier under an
    allow-listed key name (e.g. nesting patientName inside vitals)."""
    hits: list[str] = []

    def _walk(node: Any, path: str = "") -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k in _FORBIDDEN_KEYS:
                    hits.append(f"{path}.{k}" if path else k)
                _walk(v, f"{path}.{k}" if path else k)
        elif isinstance(node, list):
            for item in node:
                _walk(item, path)

    _walk(context)
    return hits
