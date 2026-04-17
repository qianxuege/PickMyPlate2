FROM python:3.11-slim

# Prevents Python from writing .pyc files and buffers stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run sets PORT; Flask reads it in app.py
EXPOSE 8080

# Disable Flask debug mode in production
ENV FLASK_DEBUG=0

CMD ["python", "app.py"]
