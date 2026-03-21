FROM node:18-slim

# Install Python and system dependencies
RUN apt-get update && apt-get install -y python3 python3-pip gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 8000

# Start both frontend and backend
CMD ["npm", "start"]
