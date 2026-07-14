#!/bin/bash
set -e

echo "Building site..."
python build.py

echo "Adding Cloudflare Pages headers..."
cat > dist/_headers << 'HEADERS'
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=3600

/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
HEADERS

echo ""
echo "Deploying to Cloudflare Pages..."
# Deploy to the production branch (main). Without --branch, wrangler uses the
# current git branch, which Cloudflare treats as a Preview deploy and does NOT
# update the custom domain (safelink.buildcraft.town).
npx wrangler pages deploy dist/ --project-name safelink-india --branch main

echo ""
echo "Deployment complete!"
echo "Site: https://safelink.buildcraft.town"
