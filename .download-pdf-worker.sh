#!/bin/bash
# Script to download PDF.js worker file for self-hosting
# Run this after installation: bash .download-pdf-worker.sh

echo "Downloading PDF.js worker..."
curl -o public/pdf.worker.min.mjs https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs

if [ $? -eq 0 ]; then
  echo "✅ PDF worker downloaded successfully to public/pdf.worker.min.mjs"
else
  echo "❌ Failed to download PDF worker"
  exit 1
fi
