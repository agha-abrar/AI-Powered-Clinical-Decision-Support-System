from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict


class SupportingEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    factor: str
    source: Literal["symptom", "history", "vital", "laboratory", "medication", "allergy", "note"]
    importance: int = Field(ge=0, le=100)


class SuggestedTest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    reason: str


class DiagnosisCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rank: int = Field(ge=1, le=5)
    conditionName: str
    icd10Code: str | None = None
    snomedCode: str | None = None
    confidence: int = Field(ge=0, le=100)
    urgency: Literal["routine", "urgent", "emergency"]
    supportingEvidence: list[SupportingEvidence] = Field(default_factory=list, max_length=20)
    contradictingEvidence: list[str] = Field(default_factory=list, max_length=20)
    missingInformation: list[str] = Field(default_factory=list, max_length=20)
    suggestedTests: list[SuggestedTest] = Field(default_factory=list, max_length=10)
    explanation: str
    limitations: list[str] = Field(default_factory=list, max_length=10)


class RedFlag(BaseModel):
    model_config = ConfigDict(extra="forbid")
    finding: str
    recommendedAction: str


class DiagnosticResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    analysisStatus: Literal["complete", "insufficient_data", "model_refusal"]
    clinicalSummary: str
    diagnoses: list[DiagnosisCandidate] = Field(default_factory=list, max_length=5)
    redFlags: list[RedFlag] = Field(default_factory=list, max_length=10)
    generalLimitations: list[str] = Field(default_factory=list, max_length=10)
    disclaimer: Literal["This output is advisory and requires review by a qualified healthcare professional."]

    @model_validator(mode="after")
    def _validate_business_rules(self) -> "DiagnosticResponse":
        if self.analysisStatus == "complete" and len(self.diagnoses) == 0:
            raise ValueError("At least one diagnosis is required when analysisStatus is complete")
        ranks = [d.rank for d in self.diagnoses]
        if ranks != sorted(ranks):
            raise ValueError("Ranks must be sequential and ascending")
        confidences = [d.confidence for d in self.diagnoses]
        if confidences != sorted(confidences, reverse=True):
            raise ValueError("Diagnoses must be sorted by confidence descending")
        return self


class DiagnosticRequestContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ageOrRange: str
    sexAtBirth: Literal["MALE", "FEMALE", "INTERSEX", "UNKNOWN"] | None = None
    pregnancyStatus: str | None = None
    presentingComplaint: str
    symptoms: list[str] = Field(default_factory=list, max_length=30)
    symptomDuration: str | None = None
    relevantPositives: list[str] = Field(default_factory=list, max_length=30)
    relevantNegatives: list[str] = Field(default_factory=list, max_length=30)
    vitals: dict[str, str | float] | None = None
    medicalHistory: list[str] = Field(default_factory=list, max_length=30)
    familyHistory: list[str] = Field(default_factory=list, max_length=20)
    currentMedications: list[str] = Field(default_factory=list, max_length=30)
    allergies: list[str] = Field(default_factory=list, max_length=20)
    labResults: list[dict[str, str]] = Field(default_factory=list, max_length=30)
    approvedNlpEntities: list[str] = Field(default_factory=list, max_length=30)
    previousRelevantDiagnoses: list[str] = Field(default_factory=list, max_length=20)
    renalInformation: str | None = None
    hepaticInformation: str | None = None
    clinicianQuestion: str | None = None


class DiagnosisAnalyzeRequest(BaseModel):
    context: DiagnosticRequestContext


class DiagnosisAnalyzeResponse(BaseModel):
    response: DiagnosticResponse
    provider: Literal["OPENROUTER", "LOCAL_DEMO"]
    requestedModel: str | None
    returnedModel: str | None
    promptTemplateVersion: str
    sanitizationVersion: str
    inputHash: str
    generationId: str | None
    promptTokens: int | None
    completionTokens: int | None
    totalTokens: int | None
    latencyMs: int
    fallbackUsed: bool
    fallbackReason: str | None
