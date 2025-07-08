#!/bin/bash
# chmod +x start-ollama-and-pull.sh

# List of models to ensure are installed
MODELS=("nomic-embed-text" "mxbai-embed-large")

# Start Ollama server in the background if not already running
if ! pgrep -f "ollama serve" > /dev/null; then
  echo "Starting Ollama server..."
  ollama serve &

  # Wait for the server to be ready
  echo "Waiting for Ollama to be ready..."
  until curl -s http://localhost:11434 > /dev/null; do
    sleep 1
  done
else
  echo "Ollama server already running."
fi

# Pull models if not already installed
for MODEL in "${MODELS[@]}"; do
  if ollama list | grep -q "$MODEL"; then
    echo "✅ Model '$MODEL' already installed."
  else
    echo "⬇️ Pulling model '$MODEL'..."
    ollama pull "$MODEL"
  fi
done

echo "🎉 All models are ready!"
