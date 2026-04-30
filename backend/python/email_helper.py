import smtplib
import ssl
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header

SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 465
SMTP_USER = 'condconnect2025@gmail.com'
SMTP_PASS = 'roke ejvm okut ivgr'


def send_email(to: str, subject: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f'CondConnect <{SMTP_USER}>'
        msg['To'] = to
        msg['Subject'] = Header(subject, 'utf-8')
        msg.attach(MIMEText(html_body, 'html', 'utf-8'))

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to, msg.as_string())
        return True
    except Exception as e:
        print(f'Email error: {e}')
        return False


def email_layout(title: str, content: str) -> str:
    return f"""<html><body style='font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;'>
  <div style='max-width:500px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>
    <h2 style='color:#1e293b;font-size:20px;text-align:center;margin-bottom:8px;'>{title}</h2>
    {content}
    <hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>
    <p style='color:#cbd5e1;font-size:12px;text-align:center;'>© 2026 CondConnect — Centro Universitário Senac</p>
  </div>
</body></html>"""
