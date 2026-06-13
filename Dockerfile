# Estágio 1: Build do Frontend React
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Estágio 2: Setup do Python & FastAPI
FROM python:3.11-slim
WORKDIR /app

# Instalar dependências de sistema necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências e instalar
COPY requirements.txt .
COPY backend/requirements.txt ./backend_requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -r backend_requirements.txt

# Copiar os códigos do backend e a base SQLite
COPY backend/ ./backend/
COPY data/ ./data/

# Copiar o frontend compilado para dentro do backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expor a porta padrão que o Cloud Run escuta (definida via variável de ambiente PORT)
ENV PORT=8080
EXPOSE 8080

# Comando para iniciar o servidor FastAPI
CMD uvicorn backend.app:app --host 0.0.0.0 --port $PORT
