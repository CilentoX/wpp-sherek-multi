FROM node:18-slim

# Install latest chromium and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, etc)
# Chromium is already in the official Debian repositories and supports both amd64 and arm64.
RUN apt-get update \
    && apt-get install -y \
      chromium \
      fonts-ipafont-gothic \
      fonts-wqy-zenhei \
      fonts-thai-tlwg \
      fonts-kacst \
      fonts-freefont-ttf \
      libxss1 \
      ca-certificates \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Environment variables
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
