from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_USER: str = "trener"
    POSTGRES_PASSWORD: str = "trener_secret"
    POSTGRES_DB: str = "trener112"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    BACKUP_DIR: str = "./backups"
    BACKUP_CRON: str = "0 3 * * *"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

settings = Settings()