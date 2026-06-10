#!/bin/bash

echo "Installing packages and booting up apps..."

# Install and run backend in the background
(cd app/smo-backend && npm install && npm start) &

# Install and run frontend in the background
(cd app/smo-frontend && npm install && npm run dev) &

# Install and run AI in the background
(cd app/smo-ai && npm install && npm start) &

# Keep the script running
wait