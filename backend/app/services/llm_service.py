import json
import logging
import re
import time
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

STOP_WORDS = {
    "the", "this", "that", "with", "from", "into", "over", "under", "about", "after", "before",
    "there", "their", "these", "those", "which", "where", "when", "what", "why", "how", "have",
    "has", "been", "will", "your", "they", "them", "then", "than", "also", "used", "study",
    "material", "topic", "concept", "ideas", "through", "cannot", "does", "done", "just", "more",
    "most", "some", "such", "each", "other", "because", "while", "without", "within", "during",
}


def _clean_json_text(raw_text: str) -> str:
    """Strip markdown code fence if present."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


class LLMService:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def has_api_key(self) -> bool:
        return self.active_provider != "fallback"

    @property
    def openai_api_key(self) -> str:
        if self.settings.OPENAI_BASE_URL.rstrip("/").lower() == "https://openrouter.ai/api/v1":
            return self.settings.OPENROUTER_API_KEY
        return self.settings.OPENAI_API_KEY

    @property
    def active_provider(self) -> str:
        if self.settings.LLM_PROVIDER == "gemini":
            return "gemini" if self.settings.GEMINI_API_KEY else "fallback"
        if self.settings.LLM_PROVIDER == "openai":
            return "openai" if self.openai_api_key else "fallback"
        if self.openai_api_key:
            return "openai"
        if self.settings.GEMINI_API_KEY:
            return "gemini"
        return "fallback"

    def generate_quiz(
        self,
        *,
        topic: str,
        context_chunks: list[str],
        difficulty: str,
        question_count: int,
    ) -> list[dict[str, Any]]:
        """
        Generates structured quiz questions using real LLM API (Gemini or OpenAI).
        Uses local heuristic extraction only when no API key is configured.
        """
        combined_context = "\n\n".join(context_chunks[:8])
        if len(combined_context) > 6000:
            combined_context = combined_context[:6000]

        logger.info(
            "generate_quiz called | provider=%s | has_key=%s | topic=%r | chunks=%d | difficulty=%s | count=%d",
            self.active_provider,
            self.has_api_key,
            topic,
            len(context_chunks),
            difficulty,
            question_count,
        )

        if self.has_api_key:
            try:
                if self.active_provider == "gemini":
                    logger.info("Calling Gemini API for quiz generation on topic=%r", topic)
                    questions = self._call_gemini_quiz(topic, combined_context, difficulty, question_count)
                elif self.active_provider == "openai":
                    logger.info("Calling OpenAI API for quiz generation on topic=%r", topic)
                    questions = self._call_openai_quiz(topic, combined_context, difficulty, question_count)
            except Exception as exc:
                self._log_provider_failure(self.active_provider, "quiz generation", exc)
                raise RuntimeError(
                    self._provider_error_message(self.active_provider, "quiz generation", exc)
                ) from exc

            if questions:
                logger.info("%s returned %d valid questions", self.active_provider, len(questions))
                return questions
            logger.warning("%s returned no valid quiz questions for topic=%r", self.active_provider, topic)
            raise RuntimeError(f"{self.active_provider} returned no valid quiz questions.")
        else:
            logger.warning("No LLM API key configured — using fallback heuristic quiz generator")

        logger.info("Using fallback heuristic quiz generator for topic=%r", topic)
        return self._generate_fallback_quiz(topic, context_chunks, difficulty, question_count)

    def analyze_document(self, *, text_chunks: list[str], file_name: str) -> dict[str, Any]:
        """
        Analyzes PDF text to extract a summary and key topics.
        """
        combined_context = "\n\n".join(text_chunks[:6])
        if len(combined_context) > 5000:
            combined_context = combined_context[:5000]

        logger.info(
            "analyze_document called | provider=%s | has_key=%s | file=%r | chunks=%d",
            self.active_provider, self.has_api_key, file_name, len(text_chunks),
        )

        if self.has_api_key:
            try:
                if self.active_provider == "gemini":
                    logger.info("Calling Gemini API for document analysis: %r", file_name)
                    analysis = self._call_gemini_analysis(combined_context, file_name)
                elif self.active_provider == "openai":
                    analysis = self._call_openai_analysis(combined_context, file_name)
            except Exception as exc:
                self._log_provider_failure(self.active_provider, "document analysis", exc)
                raise RuntimeError(
                    self._provider_error_message(self.active_provider, "document analysis", exc)
                ) from exc

            if analysis:
                return analysis
            raise RuntimeError(f"{self.active_provider} returned no valid document analysis.")
        else:
            logger.warning("No LLM API key — using fallback document analyzer for %r", file_name)

        return self._fallback_analyze_document(text_chunks, file_name)

    # -------------------------------------------------------------
    # Gemini API Implementation
    # -------------------------------------------------------------
    def _call_gemini_quiz(
        self,
        topic: str,
        context: str,
        difficulty: str,
        count: int,
    ) -> list[dict[str, Any]] | None:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.GEMINI_MODEL}:generateContent"
        headers = {"x-goog-api-key": self.settings.GEMINI_API_KEY}
        prompt = (
            f"You are an expert tutor creating a high-quality educational quiz on '{topic}'.\n"
            f"Target difficulty: {difficulty}.\n"
            f"Number of questions needed: {count}.\n"
            f"Study Context from user's study materials:\n\"\"\"\n{context}\n\"\"\"\n\n"
            "Requirements:\n"
            "1. Output STRICTLY a JSON object with a single key 'questions' containing a list of questions.\n"
            "2. Each question object MUST have:\n"
            "   - 'question': a clear, unambiguous question\n"
            "   - 'options': a list of exactly 4 plausible choices\n"
            "   - 'correct_answer': the exact matching string of the correct choice from 'options'\n"
            "   - 'explanation': a 1-2 sentence explanation of why the correct answer is right\n"
            "3. Do not include any text before or after the JSON."
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
            },
        }

        with httpx.Client(timeout=35.0) as client:
            response = self._post_with_retries(client, url, payload=payload, headers=headers)
            data = response.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return self._parse_and_validate_questions(raw_text, count)

    def _call_gemini_analysis(self, context: str, file_name: str) -> dict[str, Any] | None:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.GEMINI_MODEL}:generateContent"
        headers = {"x-goog-api-key": self.settings.GEMINI_API_KEY}
        prompt = (
            f"Analyze the following study material extracted from '{file_name}':\n\"\"\"\n{context}\n\"\"\"\n\n"
            "Provide an educational summary and extracted concepts.\n"
            "Output strictly a JSON object with:\n"
            "1. 'summary': 2-3 sentence overview of the core subject matter\n"
            "2. 'topics': a list of 3 to 6 specific key concepts/topics covered in this file\n"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        with httpx.Client(timeout=30.0) as client:
            response = self._post_with_retries(client, url, payload=payload, headers=headers)
            raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(_clean_json_text(raw_text))
            if isinstance(parsed, dict) and "summary" in parsed and "topics" in parsed:
                return {
                    "summary": str(parsed["summary"]),
                    "topics": [str(t) for t in parsed["topics"][:6]],
                }
        return None

    # -------------------------------------------------------------
    # OpenAI / Compatible API Implementation
    # -------------------------------------------------------------
    def _call_openai_quiz(
        self,
        topic: str,
        context: str,
        difficulty: str,
        count: int,
    ) -> list[dict[str, Any]] | None:
        url = f"{self.settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }
        prompt = (
            f"Create {count} multiple-choice questions on '{topic}' at '{difficulty}' difficulty.\n"
            f"Study context:\n\"\"\"\n{context}\n\"\"\"\n\n"
            "Return one JSON object with a 'questions' array. Each question must have:\n"
            "- 'question': a clear question answerable from the study context\n"
            "- 'options': exactly four complete answer strings (not labels such as A/B/C/D)\n"
            "- 'correct_answer': copied verbatim from one of the four option strings\n"
            "- 'explanation': a concise reason grounded in the study context\n"
            "Do not add markdown or text outside the JSON."
        )

        payload = {
            "model": self.settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": "You are an educational assessment AI. Always respond in valid JSON with a 'questions' key."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        }

        with httpx.Client(timeout=35.0) as client:
            response = self._post_with_retries(client, url, payload=payload, headers=headers)
            raw_text = response.json()["choices"][0]["message"]["content"]
            return self._parse_and_validate_questions(raw_text, count)

    def _call_openai_analysis(self, context: str, file_name: str) -> dict[str, Any] | None:
        url = f"{self.settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json",
        }
        prompt = (
            f"Analyze this study material from '{file_name}':\n\"\"\"\n{context}\n\"\"\"\n\n"
            "Return JSON: {\"summary\": \"...\", \"topics\": [\"topic1\", \"topic2\", ...]}"
        )

        payload = {
            "model": self.settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": "You are an educational document analyzer. Always respond with JSON with 'summary' and 'topics' keys."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        with httpx.Client(timeout=30.0) as client:
            response = self._post_with_retries(client, url, payload=payload, headers=headers)
            raw_text = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(_clean_json_text(raw_text))
            if isinstance(parsed, dict) and "summary" in parsed and "topics" in parsed:
                return {
                    "summary": str(parsed["summary"]),
                    "topics": [str(t) for t in parsed["topics"][:6]],
                }
        return None

    @staticmethod
    def _post_with_retries(
        client: httpx.Client,
        url: str,
        *,
        payload: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        for attempt in range(3):
            try:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in RETRYABLE_STATUS_CODES or attempt == 2:
                    raise
            except httpx.TransportError:
                if attempt == 2:
                    raise

            time.sleep(0.5 * (2**attempt))

        raise RuntimeError("LLM request retries exhausted.")

    @staticmethod
    def _provider_error_message(provider: str, operation: str, exc: Exception) -> str:
        if isinstance(exc, httpx.HTTPStatusError):
            status_code = exc.response.status_code
            if status_code in RETRYABLE_STATUS_CODES:
                return (
                    f"{provider} {operation} is temporarily unavailable "
                    f"(HTTP {status_code}). Please try again shortly."
                )
            return f"{provider} {operation} failed (HTTP {status_code}). Check the provider configuration."
        return f"{provider} {operation} could not reach the provider. Please try again."

    @staticmethod
    def _log_provider_failure(provider: str, operation: str, exc: Exception) -> None:
        status_code = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
        logger.error(
            "LLM %s failed | provider=%s | status=%s | error_type=%s",
            operation,
            provider,
            status_code,
            type(exc).__name__,
        )

    # -------------------------------------------------------------
    # JSON Parsing & Question Validation Helper
    # -------------------------------------------------------------
    def _parse_and_validate_questions(self, raw_text: str, expected_count: int) -> list[dict[str, Any]] | None:
        clean = _clean_json_text(raw_text)
        data = json.loads(clean)

        raw_list = data if isinstance(data, list) else data.get("questions", [])
        if not isinstance(raw_list, list) or not raw_list:
            return None

        valid_questions: list[dict[str, Any]] = []
        for item in raw_list:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            options = item.get("options", [])
            correct_answer = str(item.get("correct_answer", "")).strip()
            explanation = str(item.get("explanation") or item.get("rationale") or item.get("reason") or "").strip()

            if not question or not correct_answer or not isinstance(options, list) or len(options) < 2:
                continue

            cleaned_options = [str(opt).strip() for opt in options if str(opt).strip()]
            correct_option = next(
                (option for option in cleaned_options if option.casefold() == correct_answer.casefold()),
                None,
            )
            if correct_option is None:
                letter_match = re.fullmatch(r"(?:option\s*)?([A-D])(?:[).:\-])?", correct_answer, re.IGNORECASE)
                if letter_match and len(cleaned_options) >= 4:
                    correct_option = cleaned_options[ord(letter_match.group(1).upper()) - ord("A")]
            if not correct_option:
                continue
            if not explanation:
                continue

            if len(cleaned_options) > 4:
                if correct_option not in cleaned_options[:4]:
                    cleaned_options = [*cleaned_options[:3], correct_option]
                else:
                    cleaned_options = cleaned_options[:4]

            while len(cleaned_options) < 4:
                filler = f"Alternative {chr(65 + len(cleaned_options))}"
                if filler not in cleaned_options:
                    cleaned_options.append(filler)

            valid_questions.append({
                "question": question,
                "options": cleaned_options[:4],
                "correct_answer": correct_option,
                "explanation": explanation,
            })

            if len(valid_questions) >= expected_count:
                break

        return valid_questions if valid_questions else None

    # -------------------------------------------------------------
    # Local Deterministic Fallback Mechanisms
    # -------------------------------------------------------------
    def _generate_fallback_quiz(
        self,
        topic: str,
        context_chunks: list[str],
        difficulty: str,
        question_count: int,
    ) -> list[dict[str, Any]]:
        questions = []
        pool = context_chunks if context_chunks else [f"{topic} core principles and applications in modern systems."]

        for i in range(question_count):
            source = pool[i % len(pool)]
            cleaned = re.sub(r"\s+", " ", source).strip()
            if len(cleaned) > 220:
                cleaned = cleaned[:220]

            terms = [
                t for t in re.findall(r"\b[a-zA-Z]{4,}\b", cleaned)
                if t.lower() not in STOP_WORDS
            ]
            correct = terms[0] if terms else topic
            distractors = [t for t in terms[1:] if t.lower() != correct.lower()]
            fallback_opts = ["Architecture", "Implementation", "Evaluation", "Protocol", "Framework"]
            for f in fallback_opts:
                if len(distractors) >= 3:
                    break
                if f.lower() != correct.lower() and f not in distractors:
                    distractors.append(f)

            options = [correct, *distractors[:3]]
            prompt_q = (
                f"Which concept best represents the primary principle described for '{topic}'?"
                if difficulty.lower() in {"easy", "medium"}
                else f"Based on the foundational material, which mechanism is central to '{topic}'?"
            )
            explanation = f"'{correct}' is the key concept highlighted in the study material for {topic}."

            questions.append({
                "question": prompt_q,
                "options": options,
                "correct_answer": correct,
                "explanation": explanation,
            })

        return questions

    def _fallback_analyze_document(self, text_chunks: list[str], file_name: str) -> dict[str, Any]:
        combined = " ".join(text_chunks)
        # Extract title or words
        clean_name = re.sub(r"\.pdf$", "", file_name, flags=re.IGNORECASE).replace("_", " ").replace("-", " ")
        words = [
            w for w in re.findall(r"\b[A-Z][a-z]{3,}\b", combined)
            if w.lower() not in STOP_WORDS
        ]
        unique_topics = []
        seen = set()
        for w in [clean_name, *words]:
            if w.lower() not in seen:
                unique_topics.append(w)
                seen.add(w.lower())
            if len(unique_topics) >= 4:
                break

        summary = (
            f"This document covers key learning material on {clean_name}. "
            f"It discusses foundational concepts, structure, and practical techniques to strengthen subject mastery."
        )

        return {
            "summary": summary,
            "topics": unique_topics if unique_topics else [clean_name, "Fundamentals", "Applications"],
        }
