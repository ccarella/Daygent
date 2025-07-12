#!/bin/bash

echo "GitHub App Environment Variables on Vercel"
echo "=========================================="
echo

echo "Checking for GitHub App variables..."
echo

# Define the required variables
REQUIRED_VARS=("GITHUB_APP_ID" "GITHUB_APP_CLIENT_ID" "GITHUB_APP_CLIENT_SECRET" "GITHUB_APP_WEBHOOK_SECRET" "GITHUB_APP_PRIVATE_KEY")

# Check each variable
all_present=true
for var in "${REQUIRED_VARS[@]}"; do
    if vercel env ls | grep -q "$var"; then
        environments=$(vercel env ls | grep "$var" | awk '{print $3, $4}' | tr '\n' ', ' | sed 's/, $//')
        echo "✅ $var - Present in: $environments"
    else
        echo "❌ $var - Missing"
        all_present=false
    fi
done

echo
if $all_present; then
    echo "✅ All GitHub App environment variables are configured on Vercel!"
    echo
    echo "Your application will have access to these variables in:"
    echo "- Production deployments"
    echo "- Preview deployments"
    echo
    echo "Note: These variables are encrypted and secure on Vercel."
else
    echo "❌ Some environment variables are missing on Vercel."
fi