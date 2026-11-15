import json
import re
from io import BytesIO

from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.models.document import DocumentChunk
from app.repositories.document_repository import DocumentRepository
from app.services.llm_service import LLMService


class DocumentService:
    def __init__(self, session: Session) -> None:
        self.repository = DocumentRepository(session)
        self.session = session
        self.llm = LLMService()

    def create_document(self, *, user_id: int, file_name: str, status: str = "uploaded") -> dict[str, object]:
        document = self.repository.create(user_id=user_id, file_name=file_name, status=status)
        return {
            "id": document.id,
            "user_id": document.user_id,
            "file_name": document.file_name,
            "status": document.status,
            "summary": document.summary,
            "topics": json.loads(document.topics_json) if document.topics_json else [],
        }

    def process_uploaded_pdf(self, *, user_id: int, file_name: str, file_bytes: bytes) -> dict[str, object]:
        chunks = self._extract_chunks_from_pdf(file_bytes)
        if not chunks:
            raise ValueError(
                "This PDF has no selectable text. Scanned/image-only PDFs need OCR before they can be analyzed."
            )

        document = self.repository.create(user_id=user_id, file_name=file_name, status="processing")
        for chunk_index, (page_number, content) in enumerate(chunks):
            self.session.add(
                DocumentChunk(
                    document_id=document.id,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    content=content,
                    embedding=None,
                )
            )

        # Real LLM PDF Analysis: Extract summary and key conceptual topics
        text_samples = [c[1] for c in chunks]
        analysis = self.llm.analyze_document(text_chunks=text_samples, file_name=file_name)
        document.summary = analysis.get("summary")
        document.topics_json = json.dumps(analysis.get("topics", []))

        document.status = "processed"
        self.session.commit()
        self.session.refresh(document)

        return {
            "id": document.id,
            "user_id": document.user_id,
            "file_name": document.file_name,
            "status": document.status,
            "summary": document.summary,
            "topics": json.loads(document.topics_json) if document.topics_json else [],
        }

    def list_documents(self, user_id: int) -> list[dict[str, object]]:
        return [
            {
                "id": document.id,
                "user_id": document.user_id,
                "file_name": document.file_name,
                "status": document.status,
                "summary": document.summary,
                "topics": json.loads(document.topics_json) if document.topics_json else [],
            }
            for document in self.repository.list_for_user(user_id)
        ]

    @staticmethod
    def _extract_chunks_from_pdf(file_bytes: bytes) -> list[tuple[int, str]]:
        reader = PdfReader(BytesIO(file_bytes))
        chunks: list[tuple[int, str]] = []
        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            for chunk in DocumentService._chunk_text(text):
                chunks.append((page_number, chunk))
        return chunks

    @staticmethod
    def _chunk_text(text: str, max_chars: int = 500) -> list[str]:
        cleaned = re.sub(r"\s+", " ", text).strip()
        if not cleaned:
            return []

        paragraphs = [part.strip() for part in re.split(r"\n+", cleaned) if part.strip()]
        if not paragraphs:
            return [cleaned]

        chunks: list[str] = []
        current = ""

        for paragraph in paragraphs:
            if len(current) + len(paragraph) + 1 <= max_chars:
                current = f"{current} {paragraph}".strip() if current else paragraph
            else:
                if current:
                    chunks.append(current)
                current = paragraph

        if current:
            chunks.append(current)

        return chunks
