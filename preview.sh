#!/bin/bash

# HR Portal - Quick Preview Script
# Opens the project in a local server

PORT=8080

echo "============================================"
echo "  HR Portal - Preview Server"
echo "============================================"
echo ""
echo "Starting server on http://localhost:$PORT"
echo "Press Ctrl+C to stop"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
# Check if Python 2 is available
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
# Check if Node.js npx is available
elif command -v npx &> /dev/null; then
    npx serve -p $PORT
else
    echo "Error: No suitable server found."
    echo "Please install Python or Node.js"
    echo ""
    echo "Alternative: Open index.html directly in your browser"
    exit 1
fi
