import json

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.models.quiz import Quiz, QuizAttempt, QuizQuestion, StudentAnswer


class QuizRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_quiz(self, *, user_id: int, topic: str, difficulty: str) -> Quiz:
        quiz = Quiz(user_id=user_id, topic=topic, difficulty=difficulty)
        self.session.add(quiz)
        self.session.commit()
        self.session.refresh(quiz)
        return quiz

    def add_question(self, *, quiz_id: int, question: str, options: list[str], correct_answer: str, explanation: str | None = None) -> QuizQuestion:
        record = QuizQuestion(
            quiz_id=quiz_id,
            question=question,
            options=json.dumps(options),
            correct_answer=correct_answer,
            explanation=explanation,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def get_quiz_for_user(self, *, quiz_id: int, user_id: int) -> Quiz | None:
        return self.session.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == user_id).first()

    def get_q_and_a(self, *, question_id: int) -> QuizQuestion | None:
        return self.session.query(QuizQuestion).filter(QuizQuestion.id == question_id).first()

    def create_attempt(self, *, user_id: int, quiz_id: int, total_questions: int) -> QuizAttempt:
        attempt = QuizAttempt(user_id=user_id, quiz_id=quiz_id, score=0.0, total_questions=total_questions)
        self.session.add(attempt)
        self.session.commit()
        self.session.refresh(attempt)
        return attempt

    def add_answer(self, *, attempt_id: int, question_id: int, selected_answer: str, is_correct: bool) -> StudentAnswer:
        answer = StudentAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            selected_answer=selected_answer,
            is_correct=is_correct,
        )
        self.session.add(answer)
        self.session.commit()
        self.session.refresh(answer)
        return answer

    def fetch_topic_context(self, *, user_id: int, topic: str) -> list[str]:
        chunks = (
            self.session.query(DocumentChunk)
            .join(Document)
            .filter(Document.user_id == user_id)
            .filter(DocumentChunk.content.ilike(f"%{topic}%"))
            .order_by(DocumentChunk.id)
            .all()
        )
        if chunks:
            return [chunk.content for chunk in chunks]

        fallback = (
            self.session.query(DocumentChunk)
            .join(Document)
            .filter(Document.user_id == user_id)
            .order_by(DocumentChunk.id)
            .all()
        )
        return [chunk.content for chunk in fallback[:10]]

    def fetch_document_context(self, *, user_id: int, document_id: int) -> list[str] | None:
        document = (
            self.session.query(Document)
            .filter(Document.id == document_id, Document.user_id == user_id)
            .first()
        )
        if document is None:
            return None

        chunks = (
            self.session.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
            .all()
        )
        return [chunk.content for chunk in chunks]

    def get_attempt_history(self, *, user_id: int) -> list[QuizAttempt]:
        return (
            self.session.query(QuizAttempt)
            .filter(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.id.desc())
            .all()
        )
