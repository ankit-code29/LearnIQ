from fastapi import APIRouter

from app.services.llm_service import LLMService

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str | bool]:
    llm = LLMService()
    provider = llm.active_provider
    if provider == "openai" and llm.settings.OPENAI_BASE_URL.rstrip("/").lower() == "https://openrouter.ai/api/v1":
        provider = "openrouter"
    return {
        "status": "ok",
        "service": "LearnIQ backend",
        "database": "ready",
        "llm_provider": provider,
        "llm_configured": llm.has_api_key,
    }
