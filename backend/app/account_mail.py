"""Send password recovery links through the operator's configured SMTP relay."""

from dataclasses import dataclass
from email.message import EmailMessage
import logging
import os
import smtplib
import ssl
from urllib.parse import urlsplit


@dataclass(frozen=True)
class MailConfig:
    host: str
    port: int
    sender: str
    base_url: str
    user: str
    password: str


def configuration() -> MailConfig | None:
    host = os.getenv("ACCOUNTS_SMTP_HOST", "").strip()
    sender = os.getenv("ACCOUNTS_SMTP_FROM", "").strip()
    base_url = os.getenv("ACCOUNTS_PUBLIC_URL", "").strip().rstrip("/")
    try:
        url = urlsplit(base_url)
        port = int(os.getenv("ACCOUNTS_SMTP_PORT", "587"))
        local = url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1"}
        if not host or not sender or not url.hostname or not 1 <= port <= 65535:
            return None
        if not (url.scheme == "https" or local) or url.username or url.password or url.path or url.query or url.fragment:
            return None
    except ValueError:
        return None
    return MailConfig(host, port, sender, base_url, os.getenv("ACCOUNTS_SMTP_USER", ""),
                      os.getenv("ACCOUNTS_SMTP_PASSWORD", ""))


def send_reset(config: MailConfig, email: str, token: str) -> None:
    try:
        message = EmailMessage()
        message["Subject"] = "Restablece tu contraseña de PrimeraLlave"
        message["From"] = config.sender
        message["To"] = email
        message.set_content(
            "Abre este enlace para confirmar tu correo y elegir una nueva contraseña. "
            "Caduca en 30 minutos y solo se puede usar una vez. Si no lo pediste, ignora este correo.\n\n"
            f"{config.base_url}/#restablecer={token}\n"
        )
        context = ssl.create_default_context()
        if config.port == 465:
            connection = smtplib.SMTP_SSL(config.host, config.port, timeout=10, context=context)
        else:
            connection = smtplib.SMTP(config.host, config.port, timeout=10)
        with connection as smtp:
            if config.port != 465:
                smtp.starttls(context=context)
            if config.user:
                smtp.login(config.user, config.password)
            smtp.send_message(message)
    except (OSError, ValueError):
        logging.getLogger(__name__).warning("Could not deliver an account recovery email")
