from pydantic import BaseModel, Field


class DocumentCreate(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    status: str = "uploaded"


class DocumentRead(BaseModel):
    id: int
    user_id: int
    file_name: str
    status: str
    summary: str | None = None
    topics: list[str] = []

    model_config = {"from_attributes": True}
