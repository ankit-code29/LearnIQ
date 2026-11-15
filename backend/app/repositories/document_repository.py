from sqlalchemy.orm import Session

from app.models.document import Document


class DocumentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, *, user_id: int, file_name: str, status: str) -> Document:
        document = Document(user_id=user_id, file_name=file_name, status=status)
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def list_for_user(self, user_id: int) -> list[Document]:
        return self.session.query(Document).filter(Document.user_id == user_id).order_by(Document.id).all()
