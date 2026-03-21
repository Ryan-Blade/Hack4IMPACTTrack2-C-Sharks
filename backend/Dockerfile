FROM python:3.9-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y gcc

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run entrypoint
CMD ["python", "main.py", "--api", "--buildings", "50", "--mqtt-host", "mosquitto"]
