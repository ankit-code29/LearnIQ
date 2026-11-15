import json

from pydantic import BaseModel, Field


class QuizQuestionCreate(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    explanation: str | None = None


class QuizQuestionRead(BaseModel):
    id: int
    question: str
    options: list[str]

    @classmethod
    def from_model(cls, question: object) -> "QuizQuestionRead":
        options = json.loads(question.options) if isinstance(question.options, str) else question.options
        return cls(id=question.id, question=question.question, options=options)


class QuizGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=150)
    difficulty: str = Field(default="medium", min_length=2, max_length=50)
    question_count: int = Field(default=3, ge=1, le=10)
    document_id: int | None = None


class QuizGenerateResponse(BaseModel):
    id: int
    topic: str
    difficulty: str
    questions: list[QuizQuestionRead]


class SubmitAnswer(BaseModel):
    question_id: int
    selected_answer: str


class QuizSubmitRequest(BaseModel):
    answers: list[SubmitAnswer]


class QuizAnswerReview(BaseModel):
    question_id: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str | None = None


class QuizSubmitResponse(BaseModel):
    quiz_id: int
    score: float
    total_questions: int
    correct_answers: int
    percentage: float
    reviews: list[QuizAnswerReview]


class TopicMastery(BaseModel):
    topic: str
    mastery_score: float
    attempts: int
    latest_score: float | None = None


class Recommendation(BaseModel):
    topic: str
    priority: str
    reason: str
    mastery_score: float


class QuizInsightsResponse(BaseModel):
    average_score: float
    total_attempts: int
    topic_mastery: list[TopicMastery]
    recommendations: list[Recommendation]


class QuizHistoryEntry(BaseModel):
    attempt_id: int
    quiz_id: int
    topic: str
    score: float
    total_questions: int
    correct_answers: int
    percentage: float
