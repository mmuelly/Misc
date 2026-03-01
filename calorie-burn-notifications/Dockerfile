FROM python:3.12-slim

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .
# config.json is optional; env vars take precedence on Cloud Run
COPY config.json* ./

USER appuser

# Cloud Run sets PORT at runtime; default to 8080
ENV PORT=8080
EXPOSE 8080

CMD ["python", "agent.py"]
