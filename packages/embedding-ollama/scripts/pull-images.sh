#!/bin/bash

# alternate script: ollama serve & sleep 3 && ollama pull nomic-embed-text

# Start Ollama server in the background
ollama serve &

# Wait for the server to be ready
echo "Waiting for Ollama to start..."
until curl -s http://localhost:11434 > /dev/null; do
  sleep 1
done

# Pull the model
ollama pull nomic-embed-text