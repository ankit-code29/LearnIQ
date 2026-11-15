from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate


class UserService:
    def __init__(self, session: Session) -> None:
        self.repository = UserRepository(session)

    def register_user(self, payload: UserCreate) -> dict[str, object]:
        if self.repository.get_by_email(str(payload.email)):
            raise ValueError("A user with this email already exists.")

        user = self.repository.create(
            name=payload.name,
            email=str(payload.email),
            password_hash=hash_password(payload.password),
        )
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }

    def list_users(self) -> list[dict[str, object]]:
        return [
            {"id": user.id, "name": user.name, "email": user.email}
            for user in self.repository.get_all()
        ]
