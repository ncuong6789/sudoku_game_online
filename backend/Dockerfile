# Use official Node.js image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port (should match server.js)
EXPOSE 8080

# Environment variable for Port
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]
