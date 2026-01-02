#!/bin/bash
# DemoKit OSS Setup Script
# Run this script to set up your local development environment

set -e

echo "🚀 Setting up DemoKit OSS..."

# Check for required tools
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 is required but not installed."
    exit 1
  fi
}

check_command "docker"
check_command "pnpm"
check_command "node"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ is required (found v$NODE_VERSION)"
  exit 1
fi

echo "✅ Prerequisites check passed"

# Copy env file if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "   Edit .env to add your API keys (optional for L3 generation)"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start PostgreSQL
echo "🐘 Starting PostgreSQL with pgvector..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run database migrations
echo "🔄 Running database migrations..."
pnpm db:push

echo ""
echo "✅ DemoKit OSS setup complete!"
echo ""
echo "To start the dashboard:"
echo "  pnpm dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
echo "Optional: Add your API keys to .env for L3 generation:"
echo "  ANTHROPIC_API_KEY=sk-ant-xxx"
echo ""
