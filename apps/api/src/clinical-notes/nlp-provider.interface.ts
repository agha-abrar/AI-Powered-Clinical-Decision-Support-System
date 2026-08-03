import { Injectable } from "@nestjs/common";
import { EntityCategory } from "@prisma/client";

export interface ExtractedEntityCandidate {
  category: EntityCategory;
  text: string;
  normalizedText: string;
  startOffset: number;
  endOffset: number;
  negated: boolean;
  confidence: number;
}

/**
 * NlpProvider is the swappable interface referenced in spec section 18 — the
 * deterministic pattern matcher below satisfies it today; a spaCy-backed
 * provider (services/ai) can implement the same interface later without any
 * caller changes.
 */
export interface NlpProvider {
  readonly name: string;
  readonly version: string;
  extract(text: string): ExtractedEntityCandidate[];
}

const NEGATION_CUES = ["no ", "denies ", "without ", "negative for ", "not "];

const SYMPTOM_TERMS = [
  "fatigue", "thirst", "increased thirst", "frequent urination", "fever", "cough", "rash",
  "joint pain", "joint pains", "headache", "nausea", "vomiting", "chest pain", "shortness of breath",
];
const CONDITION_TERMS = ["diabetes", "hypertension", "asthma", "chronic kidney disease", "lupus", "rheumatoid arthritis"];
const MEDICATION_TERMS = ["metformin", "lisinopril", "amoxicillin", "azithromycin", "warfarin", "ibuprofen"];
const ALLERGY_TERMS = ["penicillin", "sulfa", "latex", "shellfish"];
const DURATION_PATTERN = /\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/gi;

@Injectable()
export class DeterministicNlpProvider implements NlpProvider {
  readonly name = "deterministic-pattern-matcher";
  readonly version = "1.0.0";

  extract(text: string): ExtractedEntityCandidate[] {
    const lower = text.toLowerCase();
    const results: ExtractedEntityCandidate[] = [];

    const scan = (terms: string[], category: EntityCategory) => {
      for (const term of terms) {
        let idx = lower.indexOf(term);
        while (idx !== -1) {
          const precedingWindow = lower.slice(Math.max(0, idx - 20), idx);
          const negated = NEGATION_CUES.some((cue) => precedingWindow.endsWith(cue) || precedingWindow.includes(cue));
          results.push({
            category,
            text: text.slice(idx, idx + term.length),
            normalizedText: term,
            startOffset: idx,
            endOffset: idx + term.length,
            negated,
            confidence: 0.9,
          });
          idx = lower.indexOf(term, idx + term.length);
        }
      }
    };

    scan(SYMPTOM_TERMS, "SYMPTOM");
    scan(CONDITION_TERMS, "CONDITION");
    scan(MEDICATION_TERMS, "MEDICATION");
    scan(ALLERGY_TERMS, "ALLERGY");

    let match: RegExpExecArray | null;
    DURATION_PATTERN.lastIndex = 0;
    while ((match = DURATION_PATTERN.exec(text)) !== null) {
      results.push({
        category: "DURATION",
        text: match[0],
        normalizedText: match[0].toLowerCase(),
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        negated: false,
        confidence: 0.95,
      });
    }

    return results;
  }
}
