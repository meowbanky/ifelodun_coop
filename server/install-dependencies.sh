#!/bin/bash

echo "Installing missing dependencies for bank statement processing..."

# Install formdata-node
npm install formdata-node@^5.0.0

# Update openai to a compatible version
npm install openai@^4.20.1

# Install other required dependencies if not already present
npm install string-similarity@^4.0.4
npm install pdf-parse@^1.1.1
npm install xlsx@^0.18.5

echo "Dependencies installed successfully!"
echo "You can now restart your server." 