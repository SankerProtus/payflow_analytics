#!/bin/bash
# Run migrations on Railway database

# This script runs migrations directly on Railway's servers
# to avoid conflicts with local .env files

echo "Running database migrations on Railway..."
railway run --service payflow_analytics npm run migrate
