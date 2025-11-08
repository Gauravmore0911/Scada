# Use Node.js LTS
FROM node:20

# Install ping utility (for network testing)
RUN apt update && apt install -y iputils-ping

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of backend code
COPY . .

# Expose port from env at build time (optional)
ARG PORT=12000
ENV PORT=$PORT
EXPOSE $PORT

# Start the server
CMD ["node", "server.js"]
