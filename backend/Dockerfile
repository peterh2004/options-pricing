# Multi-stage build for a slim production image.

# ---------- builder ----------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

# System deps needed to compile scipy / pandas on slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc gfortran libopenblas-dev liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --prefix=/install \
    "fastapi>=0.115" "uvicorn[standard]>=0.32" "pydantic>=2.9" "pydantic-settings>=2.6" \
    "numpy>=2.1" "scipy>=1.14" "pandas>=2.2" "yfinance>=0.2.50" "sqlalchemy>=2.0" \
    "python-dateutil>=2.9" "httpx>=0.28"

# ---------- runtime ----------
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/install/bin:$PATH \
    PYTHONPATH=/install/lib/python3.12/site-packages

RUN apt-get update && apt-get install -y --no-install-recommends \
    libopenblas0 liblapack3 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 vollab

COPY --from=builder /install /install

WORKDIR /app
COPY app ./app

USER vollab
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').read()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
