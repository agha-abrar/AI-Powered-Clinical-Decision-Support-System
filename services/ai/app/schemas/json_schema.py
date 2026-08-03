"""Hand-maintained JSON Schema for response_format.json_schema, kept in lockstep
with app.schemas.diagnosis.DiagnosticResponse. additionalProperties is false
everywhere so OpenRouter's strict mode rejects any unexpected field."""

DIAGNOSTIC_RESPONSE_JSON_SCHEMA: dict = {
    "type": "object",
    "additionalProperties": False,
    "required": ["analysisStatus", "clinicalSummary", "diagnoses", "redFlags", "generalLimitations", "disclaimer"],
    "properties": {
        "analysisStatus": {"type": "string", "enum": ["complete", "insufficient_data", "model_refusal"]},
        "clinicalSummary": {"type": "string"},
        "diagnoses": {
            "type": "array",
            "maxItems": 5,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "rank", "conditionName", "icd10Code", "snomedCode", "confidence", "urgency",
                    "supportingEvidence", "contradictingEvidence", "missingInformation",
                    "suggestedTests", "explanation", "limitations",
                ],
                "properties": {
                    "rank": {"type": "integer", "minimum": 1, "maximum": 5},
                    "conditionName": {"type": "string"},
                    "icd10Code": {"type": ["string", "null"]},
                    "snomedCode": {"type": ["string", "null"]},
                    "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
                    "urgency": {"type": "string", "enum": ["routine", "urgent", "emergency"]},
                    "supportingEvidence": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["factor", "source", "importance"],
                            "properties": {
                                "factor": {"type": "string"},
                                "source": {
                                    "type": "string",
                                    "enum": ["symptom", "history", "vital", "laboratory", "medication", "allergy", "note"],
                                },
                                "importance": {"type": "integer", "minimum": 0, "maximum": 100},
                            },
                        },
                    },
                    "contradictingEvidence": {"type": "array", "items": {"type": "string"}},
                    "missingInformation": {"type": "array", "items": {"type": "string"}},
                    "suggestedTests": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["name", "reason"],
                            "properties": {"name": {"type": "string"}, "reason": {"type": "string"}},
                        },
                    },
                    "explanation": {"type": "string"},
                    "limitations": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "redFlags": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["finding", "recommendedAction"],
                "properties": {"finding": {"type": "string"}, "recommendedAction": {"type": "string"}},
            },
        },
        "generalLimitations": {"type": "array", "items": {"type": "string"}},
        "disclaimer": {
            "type": "string",
            "const": "This output is advisory and requires review by a qualified healthcare professional.",
        },
    },
}
