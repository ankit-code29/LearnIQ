import json
import re
from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.repositories.quiz_repository import QuizRepository
from app.services.llm_service import LLMService
from app.schemas.quiz import (
    QuizGenerateResponse,
    QuizHistoryEntry,
    QuizInsightsResponse,
    QuizAnswerReview,
    QuizQuestionRead,
    QuizSubmitResponse,
    Recommendation,
    TopicMastery,
)

STOP_WORDS = {
    "the", "this", "that", "with", "from", "into", "over", "under", "about", "after", "before",
    "there", "their", "these", "those", "which", "where", "when", "what", "why", "how", "have",
    "has", "been", "will", "your", "they", "them", "then", "than", "also", "used", "study",
    "material", "topic", "concept", "ideas", "through", "cannot", "does", "done", "just", "more",
    "most", "some", "such", "each", "other", "because", "while", "without", "within", "during",
}


class QuizService:
    def __init__(self, session: Session) -> None:
        self.repository = QuizRepository(session)
        self.session = session
        self.llm = LLMService()

    def generate_quiz(
        self,
        *,
        user_id: int,
        topic: str,
        difficulty: str,
        question_count: int,
        document_id: int | None = None,
    ) -> QuizGenerateResponse:
        if document_id is not None:
            source_material = self.repository.fetch_document_context(
                user_id=user_id,
                document_id=document_id,
            )
            if source_material is None:
                raise ValueError("The selected document was not found.")
            if not source_material:
                raise ValueError("The selected document has no readable text to make a quiz from.")
        else:
            source_material = self.repository.fetch_topic_context(user_id=user_id, topic=topic)

        if not source_material:
            source_material = [
                f"{topic} is a core learning concept that students should understand, review, and practice with examples and repetition."
            ]

        # Generate questions from the source material using the configured provider or local fallback.
        generated_questions = self.llm.generate_quiz(
            topic=topic,
            context_chunks=source_material,
            difficulty=difficulty,
            question_count=question_count,
        )

        quiz = self.repository.create_quiz(user_id=user_id, topic=topic, difficulty=difficulty)
        questions: list[QuizQuestionRead] = []
        for q_data in generated_questions:
            question = self.repository.add_question(
                quiz_id=quiz.id,
                question=q_data["question"],
                options=q_data["options"],
                correct_answer=q_data["correct_answer"],
                explanation=q_data.get("explanation"),
            )
            questions.append(QuizQuestionRead.from_model(question))

        return QuizGenerateResponse(
            id=quiz.id,
            topic=quiz.topic,
            difficulty=quiz.difficulty,
            questions=questions,
        )

    def submit_quiz(self, *, user_id: int, quiz_id: int, answers: Sequence[dict[str, str]]) -> QuizSubmitResponse:
        quiz = self.repository.get_quiz_for_user(quiz_id=quiz_id, user_id=user_id)
        if quiz is None:
            raise ValueError("Quiz not found for this user.")

        questions = self.session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
        if not questions:
            raise ValueError("This quiz has no questions.")

        attempt = self.repository.create_attempt(user_id=user_id, quiz_id=quiz.id, total_questions=len(questions))
        correct_count = 0
        answers_by_question = {
            int(answer["question_id"]): str(answer["selected_answer"])
            for answer in answers
        }
        reviews: list[QuizAnswerReview] = []

        for question in questions:
            selected_answer = answers_by_question.get(question.id, "")
            is_correct = question.correct_answer == selected_answer
            if question.id in answers_by_question:
                self.repository.add_answer(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    selected_answer=selected_answer,
                    is_correct=is_correct,
                )
            if is_correct:
                correct_count += 1
            reviews.append(
                QuizAnswerReview(
                    question_id=question.id,
                    selected_answer=selected_answer,
                    correct_answer=question.correct_answer,
                    is_correct=is_correct,
                    explanation=question.explanation,
                )
            )

        attempt.score = float(correct_count)
        self.session.commit()
        percentage = (correct_count / len(questions) * 100.0) if questions else 0.0
        return QuizSubmitResponse(
            quiz_id=quiz.id,
            score=float(correct_count),
            total_questions=len(questions),
            correct_answers=correct_count,
            percentage=round(percentage, 2),
            reviews=reviews,
        )

    def get_user_insights(self, *, user_id: int) -> QuizInsightsResponse:
        attempts: list[QuizAttempt] = (
            self.session.query(QuizAttempt)
            .filter(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.id)
            .all()
        )

        if not attempts:
            return QuizInsightsResponse(
                average_score=0.0,
                total_attempts=0,
                topic_mastery=[],
                recommendations=[],
            )

        topic_scores: dict[str, list[float]] = {}
        for attempt in attempts:
            if attempt.total_questions <= 0:
                continue
            percent = (attempt.score / attempt.total_questions) * 100.0
            topic = attempt.quiz.topic if attempt.quiz is not None else "unknown"
            topic_scores.setdefault(topic, []).append(percent)

        topic_mastery = [
            TopicMastery(
                topic=topic,
                mastery_score=round(sum(scores) / len(scores), 2),
                attempts=len(scores),
                latest_score=round(scores[-1], 2),
            )
            for topic, scores in topic_scores.items()
        ]
        topic_mastery.sort(key=lambda item: item.mastery_score)

        all_scores = [score for entry in topic_mastery for score in [entry.mastery_score]]
        average_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0

        recommendations: list[Recommendation] = []
        for item in topic_mastery:
            if item.mastery_score < 50:
                priority = "urgent review"
                reason = f"{item.topic} is below a safe mastery threshold; revisit the core concepts and retake a quiz soon."
            elif item.mastery_score < 70:
                priority = "review"
                reason = f"{item.topic} is improving but still needs reinforcement before moving on to harder material."
            else:
                priority = "maintain"
                reason = f"{item.topic} is strong; keep practicing with mixed questions to deepen retention."
            recommendations.append(
                Recommendation(
                    topic=item.topic,
                    priority=priority,
                    reason=reason,
                    mastery_score=item.mastery_score,
                )
            )

        recommendations.sort(key=lambda item: item.mastery_score)
        return QuizInsightsResponse(
            average_score=average_score,
            total_attempts=len(attempts),
            topic_mastery=sorted(topic_mastery, key=lambda item: item.mastery_score, reverse=True),
            recommendations=recommendations,
        )

    def get_user_history(self, *, user_id: int) -> list[QuizHistoryEntry]:
        attempts = self.repository.get_attempt_history(user_id=user_id)
        history: list[QuizHistoryEntry] = []

        for attempt in attempts:
            if attempt.total_questions <= 0:
                continue
            score = float(attempt.score)
            correct_answers = int(min(score, attempt.total_questions))
            percentage = (score / attempt.total_questions) * 100.0 if attempt.total_questions else 0.0
            topic = attempt.quiz.topic if attempt.quiz is not None else "Unknown topic"
            history.append(
                QuizHistoryEntry(
                    attempt_id=attempt.id,
                    quiz_id=attempt.quiz_id,
                    topic=topic,
                    score=score,
                    total_questions=attempt.total_questions,
                    correct_answers=correct_answers,
                    percentage=round(percentage, 2),
                )
            )

        return history

    @staticmethod
    def _build_question(topic: str, source_text: str, difficulty: str) -> tuple[str, list[str], str, str]:
        cleaned = re.sub(r"\s+", " ", source_text).strip()
        if len(cleaned) > 220:
            cleaned = cleaned[:220]

        sentence_candidates = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", cleaned) if segment.strip()]
        context = sentence_candidates[0] if sentence_candidates else cleaned

        keywords = []
        for term in re.findall(r"\b[a-zA-Z]{4,}\b", cleaned):
            if term.lower() not in STOP_WORDS:
                keywords.append(term)

        if not keywords:
            keywords = [topic, "principle", "example", "review"]

        clean_terms = []
        seen: set[str] = set()
        for term in keywords:
            normalized = term.strip().lower()
            if normalized not in seen:
                clean_terms.append(term)
                seen.add(normalized)
            if len(clean_terms) >= 5:
                break

        correct_answer = clean_terms[0] if clean_terms else topic
        distractors = []
        for option in clean_terms[1:]:
            if option != correct_answer:
                distractors.append(option)

        if len(distractors) < 3:
            fallback_options = ["framework", "application", "comparison", "summary"]
            for option in fallback_options:
                if option not in distractors and option != correct_answer:
                    distractors.append(option)
                if len(distractors) >= 3:
                    break

        options = [correct_answer, *distractors[:3]]
        if len(options) < 4:
            for option in [topic, "practice", "analysis", "review"]:
                if option not in options:
                    options.append(option)
                if len(options) >= 4:
                    break

        question = (
            f"Which term best matches the central idea discussed in the following study passage for '{topic}'?"
            if difficulty.lower() in {"easy", "medium"}
            else f"Based on the passage below, which concept is most strongly implied for '{topic}'?"
        )
        explanation = (
            f"The answer is '{correct_answer}' because the source material focuses on that concept and uses it as the main learning point."
        )
        return question, options[:4], correct_answer, explanation
