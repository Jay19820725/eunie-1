# Stage 1: Build the application
FROM node:22-slim AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
# Note: The project currently uses npm (package-lock.json), 
# but we follow the user's request to use pnpm for the build.
COPY package.json package-lock.json* ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Serve the static files using Caddy
FROM zeabur/caddy-static

# Copy the built files from the builder stage to the Caddy public directory
# zeabur/caddy-static expects files in the /public directory
COPY --from=builder /app/dist /public

# Expose port 8080 as requested for Zeabur
EXPOSE 8080
