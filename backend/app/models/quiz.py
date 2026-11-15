import json

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    topic: Mapped[str] = mapped_column(String(150), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)

    user: Mapped["User"] = relationship(back_populates="quizzes")
    questions: Mapped[list["QuizQuestion"]] = relationship(back_populates="quiz")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="quiz")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    quiz: Mapped[Quiz] = relationship(back_populates="questions")
    answers: Mapped[list["StudentAnswer"]] = relationship(back_populates="question")

    def option_list(self) -> list[str]:
        return json.loads(self.options)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    score: Mapped[float] = mapped_column(default=0.0, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="quiz_attempts")
    quiz: Mapped[Quiz] = relationship(back_populates="attempts")
    answers: Mapped[list["StudentAnswer"]] = relationship(back_populates="attempt")


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("quiz_attempts.id"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("quiz_questions.id"), nullable=False)
    selected_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    is_correct: Mapped[bool] = mapped_column(default=False, nullable=False)

    attempt: Mapped[QuizAttempt] = relationship(back_populates="answers")
    question: Mapped[QuizQuestion] = relationship(back_populates="answers")
