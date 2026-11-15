from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizHistoryEntry,
    QuizInsightsResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services.quiz_service import QuizService

router = APIRouter()


@router.post("", response_model=QuizGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizGenerateResponse:
    service = QuizService(db)
    try:
        return service.generate_quiz(
            user_id=current_user.id,
            topic=payload.topic,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
            document_id=payload.document_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/insights", response_model=QuizInsightsResponse)
def get_quiz_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizInsightsResponse:
    service = QuizService(db)
    return service.get_user_insights(user_id=current_user.id)


@router.get("/history", response_model=list[QuizHistoryEntry])
def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[QuizHistoryEntry]:
    service = QuizService(db)
    return service.get_user_history(user_id=current_user.id)


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    quiz_id: int,
    payload: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuizSubmitResponse:
    service = QuizService(db)
    try:
        return service.submit_quiz(
            user_id=current_user.id,
            quiz_id=quiz_id,
            answers=[answer.model_dump() for answer in payload.answers],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
