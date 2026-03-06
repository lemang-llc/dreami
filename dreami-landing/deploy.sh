#!/bin/bash
# dreAmI Landing Page — Deployment Script
# Builds the React app and deploys to S3 + invalidates CloudFront.
#
# Usage:
#   ./deploy.sh                          # uses defaults below
#   ./deploy.sh <bucket> <cf-dist-id>   # override bucket and/or distribution

set -e

# ─── Configuration ────────────────────────────────────────────────────────────
BUCKET_NAME="${1:-dreami-landing}"
DISTRIBUTION_ID="${2:-EUKBSGK4IOINN}"          # set a default here once you have it
AWS_REGION="us-east-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/dist"
LIVE_URL="https://dreami.lemang.llc"

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

# ─── Pre-flight checks ────────────────────────────────────────────────────────
command -v aws  &>/dev/null || error "AWS CLI not installed. Run: brew install awscli"
command -v npm  &>/dev/null || error "npm not installed."
aws sts get-caller-identity &>/dev/null || error "AWS credentials not configured. Run: aws configure"

# ─── Build ────────────────────────────────────────────────────────────────────
info "Installing dependencies..."
cd "$SCRIPT_DIR" && npm install

info "Building..."
npm run build
[ -d "$BUILD_DIR" ] || error "Build failed — dist/ not found."
success "Build complete."

# ─── S3 bucket setup (first deploy only) ─────────────────────────────────────
if ! aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
  warn "Bucket s3://$BUCKET_NAME not found — creating it..."

  aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"

  aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html

  cat > /tmp/dreami-bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
  }]
}
EOF
  aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy file:///tmp/dreami-bucket-policy.json
  rm /tmp/dreami-bucket-policy.json

  success "Bucket created and configured."
fi

# ─── Upload ───────────────────────────────────────────────────────────────────
info "Uploading to s3://$BUCKET_NAME ..."

# index.html — short cache so updates propagate quickly
aws s3 cp "$BUILD_DIR/index.html" "s3://$BUCKET_NAME/index.html" \
  --content-type "text/html" \
  --cache-control "max-age=300, must-revalidate"

# robots.txt + sitemap — no cache
for f in robots.txt sitemap.xml; do
  [ -f "$BUILD_DIR/$f" ] && aws s3 cp "$BUILD_DIR/$f" "s3://$BUCKET_NAME/$f" \
    --cache-control "max-age=0, must-revalidate"
done

# Hashed assets (JS/CSS) — immutable, 1 year
if [ -d "$BUILD_DIR/assets" ]; then
  aws s3 sync "$BUILD_DIR/assets/" "s3://$BUCKET_NAME/assets/" \
    --cache-control "max-age=31536000, immutable"
fi

# Images — 1 week
if [ -d "$BUILD_DIR/images" ]; then
  aws s3 sync "$BUILD_DIR/images/" "s3://$BUCKET_NAME/images/" \
    --cache-control "max-age=604800"
fi

# Everything else (favicons, etc.) — 1 day
aws s3 sync "$BUILD_DIR/" "s3://$BUCKET_NAME/" \
  --exclude "index.html" \
  --exclude "assets/*" \
  --exclude "images/*" \
  --exclude "robots.txt" \
  --exclude "sitemap.xml" \
  --cache-control "max-age=86400"

success "Upload complete."

# ─── CloudFront invalidation ──────────────────────────────────────────────────
if [ -n "$DISTRIBUTION_ID" ]; then
  info "Invalidating CloudFront distribution $DISTRIBUTION_ID ..."
  INV_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)
  success "Invalidation created: $INV_ID (may take 5–15 min)"
else
  warn "No CloudFront distribution ID set — skipping invalidation."
  warn "Set DISTRIBUTION_ID at the top of deploy.sh or pass it as \$2."
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
success "Deployment done!"
echo ""
info "S3 endpoint : http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
[ -n "$DISTRIBUTION_ID" ] && info "Live at      : $LIVE_URL"
echo ""
