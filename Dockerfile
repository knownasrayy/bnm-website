FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build frontend (optional, if we want to serve it via this container)
# RUN npm run build

# Expose ports
EXPOSE 50051 3001 3002 8080

# Default command (will be overridden by docker-compose)
CMD ["npm", "run", "grpc"]
