FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Expose Vite preview port
EXPOSE 8080

# Serve via Vite preview
CMD ["npm", "run", "preview", "--", "--port", "8080", "--host", "0.0.0.0"]
