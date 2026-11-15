import json
from pathlib import Path

import pytest
import httpx
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine, init_db, reset_database
from app.main import app
from app.models.document import Document, DocumentChunk
from app.models.quiz import Quiz, QuizQuestion
from app.models.user import User
from app.repositories.quiz_repository import QuizRepository
from app.services.document_service import DocumentService
from app.services.llm_service import LLMService

client = TestClient(app)


def create_test_pdf() -> bytes:
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 56 >>
stream
BT
/F1 18 Tf
50 100 Td
(LearnIQ study guide) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000123 00000 n 
0000000245 00000 n 
0000000459 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
550
%%EOF
"""


def reset_db() -> None:
    reset_database()
    init_db()
    db = SessionLocal()
    try:
        db.query(DocumentChunk).delete()
        db.query(Document).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


def test_root_endpoint() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_signup_does_not_depend_on_health_request() -> None:
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as startup_client:
        response = startup_client.post(
            "/api/v1/auth/register",
            json={"name": "First Student", "email": "first@example.com", "password": "secret123"},
        )

    assert response.status_code == 201
    assert response.json()["email"] == "first@example.com"


def test_health_endpoint() -> None:
    reset_db()
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "LearnIQ backend"


def test_database_user_roundtrip() -> None:
    reset_db()
    db = SessionLocal()
    try:
        user = User(name="Ava", email="ava@example.com", password_hash="pbkdf2_sha256$100000$abc$def")
        db.add(user)
        db.commit()
        saved = db.query(User).filter(User.email == "ava@example.com").first()
        assert saved is not None
        assert saved.name == "Ava"
    finally:
        db.close()


def test_document_context_is_limited_to_selected_document() -> None:
    reset_db()
    db = SessionLocal()
    try:
        user = User(name="Context Student", email="context@example.com", password_hash="hash")
        db.add(user)
        db.commit()

        selected = Document(user_id=user.id, file_name="selected.pdf", status="processed")
        other = Document(user_id=user.id, file_name="other.pdf", status="processed")
        db.add_all([selected, other])
        db.commit()
        db.add_all(
            [
                DocumentChunk(document_id=selected.id, chunk_index=0, content="selected PDF text"),
                DocumentChunk(document_id=other.id, chunk_index=0, content="unrelated PDF text"),
            ]
        )
        db.commit()

        repository = QuizRepository(db)
        assert repository.fetch_document_context(user_id=user.id, document_id=selected.id) == ["selected PDF text"]
        assert repository.fetch_document_context(user_id=user.id + 1, document_id=selected.id) is None
    finally:
        db.close()


def test_scanned_pdf_has_no_extractable_text() -> None:
    from io import BytesIO

    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=300, height=200)
    pdf_buffer = BytesIO()
    writer.write(pdf_buffer)

    assert DocumentService._extract_chunks_from_pdf(pdf_buffer.getvalue()) == []


def test_configured_llm_error_is_not_hidden_by_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    service = LLMService()
    monkeypatch.setattr(service.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service.settings, "LLM_PROVIDER", "gemini")

    def fail_generation(*args: object, **kwargs: object) -> None:
        raise ValueError("provider unavailable")

    monkeypatch.setattr(service, "_call_gemini_quiz", fail_generation)

    with pytest.raises(RuntimeError, match="gemini quiz generation could not reach the provider"):
        service.generate_quiz(
            topic="selected document",
            context_chunks=["source PDF text"],
            difficulty="easy",
            question_count=1,
        )


def test_provider_request_retries_temporary_503(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        status_code = 503 if attempts == 1 else 200
        return httpx.Response(status_code, json={"ok": True}, request=request)

    monkeypatch.setattr("app.services.llm_service.time.sleep", lambda _: None)
    with httpx.Client(transport=httpx.MockTransport(respond)) as http_client:
        response = LLMService._post_with_retries(
            http_client,
            "https://provider.test/generate",
            payload={},
        )

    assert response.status_code == 200
    assert attempts == 2


def test_provider_error_message_never_contains_api_key() -> None:
    request = httpx.Request("POST", "https://provider.test/generate?key=private-key")
    response = httpx.Response(503, request=request)
    error = httpx.HTTPStatusError("upstream error", request=request, response=response)

    message = LLMService._provider_error_message("gemini", "quiz generation", error)

    assert "503" in message
    assert "private-key" not in message


def test_llm_quiz_answer_must_match_an_option() -> None:
    service = LLMService()
    parsed = service._parse_and_validate_questions(
        json.dumps(
            {
                "questions": [
                    {
                        "question": "Which option is correct?",
                        "options": ["Wrong", "Correct", "Other", "Another"],
                        "correct_answer": "correct",
                        "explanation": "The passage says so.",
                    }
                ]
            }
        ),
        1,
    )
    invalid = service._parse_and_validate_questions(
        json.dumps(
            {
                "questions": [
                    {
                        "question": "Which option is correct?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "not an option",
                    }
                ]
            }
        ),
        1,
    )

    assert parsed is not None
    assert parsed[0]["correct_answer"] == "Correct"
    assert parsed[0]["correct_answer"] in parsed[0]["options"]
    assert invalid is None


def test_llm_quiz_letter_answer_maps_to_full_option() -> None:
    service = LLMService()
    parsed = service._parse_and_validate_questions(
        json.dumps(
            {
                "questions": [
                    {
                        "question": "Which option is correct?",
                        "options": ["First choice", "Second choice", "Third choice", "Fourth choice"],
                        "correct_answer": "B",
                        "reason": "The passage supports the second choice.",
                    }
                ]
            }
        ),
        1,
    )

    assert parsed is not None
    assert parsed[0]["correct_answer"] == "Second choice"
    assert parsed[0]["explanation"] == "The passage supports the second choice."


def test_openrouter_uses_its_own_key_and_provider_setting(monkeypatch: pytest.MonkeyPatch) -> None:
    service = LLMService()
    monkeypatch.setattr(service.settings, "LLM_PROVIDER", "openai")
    monkeypatch.setattr(service.settings, "OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setattr(service.settings, "OPENROUTER_API_KEY", "router-test-key")
    monkeypatch.setattr(service.settings, "OPENAI_API_KEY", "other-provider-test-key")

    assert service.active_provider == "openai"
    assert service.openai_api_key == "router-test-key"


def test_openrouter_does_not_fall_back_to_another_provider_key(monkeypatch: pytest.MonkeyPatch) -> None:
    service = LLMService()
    monkeypatch.setattr(service.settings, "LLM_PROVIDER", "openai")
    monkeypatch.setattr(service.settings, "OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setattr(service.settings, "OPENROUTER_API_KEY", "")
    monkeypatch.setattr(service.settings, "OPENAI_API_KEY", "other-provider-test-key")

    assert service.active_provider == "fallback"
    assert service.has_api_key is False


def test_auth_and_document_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        LLMService,
        "analyze_document",
        lambda self, *, text_chunks, file_name: {"summary": "Test summary", "topics": ["Testing"]},
    )
    reset_db()
    payload = {"name": "Liam", "email": "liam@example.com", "password": "secret123"}
    register_response = client.post("/api/v1/auth/register", json=payload)
    assert register_response.status_code == 201
    assert register_response.json()["email"] == payload["email"]

    login_response = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    document_response = client.post(
        "/api/v1/documents",
        json={"file_name": "Data Structures.pdf", "status": "uploaded"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert document_response.status_code == 201
    assert document_response.json()["file_name"] == "Data Structures.pdf"

    list_response = client.get("/api/v1/documents", headers={"Authorization": f"Bearer {token}"})
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    upload_response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("learniq.pdf", create_test_pdf(), "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert upload_response.status_code == 201
    assert upload_response.json()["status"] == "processed"

    db = SessionLocal()
    try:
        documents = db.query(Document).filter(Document.user_id == 1).all()
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == documents[-1].id).all()
        assert len(documents) >= 2
        assert len(chunks) >= 1
    finally:
        db.close()


def test_quiz_generation_and_submission(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        LLMService,
        "analyze_document",
        lambda self, *, text_chunks, file_name: {"summary": "Test summary", "topics": ["Testing"]},
    )
    monkeypatch.setattr(
        LLMService,
        "generate_quiz",
        lambda self, *, topic, context_chunks, difficulty, question_count: [
            {
                "question": "What does this document teach?",
                "options": ["Testing", "Other", "Third", "Fourth"],
                "correct_answer": "Testing",
                "explanation": "The source document explicitly covers testing.",
            }
            for _ in range(question_count)
        ],
    )
    reset_db()
    payload = {"name": "Quiz Student", "email": "quiz@example.com", "password": "secret123"}
    client.post("/api/v1/auth/register", json=payload)
    login = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    token = login.json()["access_token"]

    document = client.post(
        "/api/v1/documents/upload",
        files={"file": ("study-guide.pdf", create_test_pdf(), "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert document.status_code == 201

    generate = client.post(
        "/api/v1/quizzes",
        json={
            "topic": "study guide",
            "difficulty": "easy",
            "question_count": 2,
            "document_id": document.json()["id"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert generate.status_code == 201
    body = generate.json()
    assert body["topic"] == "study guide"
    assert len(body["questions"]) == 2
    assert all("correct_answer" not in question for question in body["questions"])
    assert all("explanation" not in question for question in body["questions"])

    db = SessionLocal()
    try:
        quiz = db.query(Quiz).filter(Quiz.user_id == 1).first()
        question_records = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
        answer_payload = {
            "answers": [
                {
                    "question_id": question.id,
                    "selected_answer": "Other" if index == 0 else question.correct_answer,
                }
                for index, question in enumerate(question_records)
            ]
        }
    finally:
        db.close()

    submit = client.post(
        f"/api/v1/quizzes/{quiz.id}/submit",
        json=answer_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit.status_code == 200
    result = submit.json()
    assert result["quiz_id"] == quiz.id
    assert result["correct_answers"] == 1
    assert result["percentage"] == 50.0
    reviews = {review["question_id"]: review for review in result["reviews"]}
    incorrect_question_id = answer_payload["answers"][0]["question_id"]
    assert reviews[incorrect_question_id] == {
        "question_id": incorrect_question_id,
        "selected_answer": "Other",
        "correct_answer": "Testing",
        "is_correct": False,
        "explanation": "The source document explicitly covers testing.",
    }

    insights = client.get("/api/v1/quizzes/insights", headers={"Authorization": f"Bearer {token}"})
    assert insights.status_code == 200
    body = insights.json()
    assert body["total_attempts"] >= 1
    assert body["average_score"] >= 0
    assert body["topic_mastery"]
    assert body["recommendations"]
    assert body["recommendations"][0]["topic"] == "study guide"

    history = client.get("/api/v1/quizzes/history", headers={"Authorization": f"Bearer {token}"})
    assert history.status_code == 200
    history_body = history.json()
    assert len(history_body) >= 1
    assert history_body[0]["topic"] == "study guide"
