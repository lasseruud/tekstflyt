import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql://tekstflyt:tekstflyt@localhost:5432/tekstflyt")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-this-in-production")
    JWT_EXPIRY_HOURS: int = int(os.environ.get("JWT_EXPIRY_HOURS", "24"))
    CORS_ORIGIN: str = os.environ.get("CORS_ORIGIN", "http://localhost:5173")
    SECURE_COOKIES: bool = os.environ.get("SECURE_COOKIES", "0") == "1"
    UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
    MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024  # 20 MB
    ALLOWED_EXTENSIONS: set[str] = {"pdf", "docx", "doc", "xlsx", "xls", "jpg", "jpeg", "png"}

    @classmethod
    def validate(cls) -> None:
        if cls.SECURE_COOKIES and cls.JWT_SECRET == "change-this-in-production":
            raise RuntimeError("JWT_SECRET must be set in production")
