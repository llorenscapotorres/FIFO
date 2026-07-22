from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DomainError(Exception):
    status_code = 400

    def __init__(self, message: str, **extra):
        self.message = message
        self.extra = extra
        super().__init__(message)


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class UnauthorizedError(DomainError):
    status_code = 401


class ValidationError(DomainError):
    status_code = 422


class InsufficientSharesError(DomainError):
    status_code = 422

    def __init__(self, available_shares, requested_shares):
        super().__init__(
            "No hay suficientes acciones disponibles para vender esa cantidad.",
            available_shares=str(available_shares),
            requested_shares=str(requested_shares),
        )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, **exc.extra},
        )
