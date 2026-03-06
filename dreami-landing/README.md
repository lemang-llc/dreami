# dreAmI Landing Page

React + Vite static site deployed to AWS S3 + CloudFront at **https://dreami.lemang.llc**.

---

## Quick start (local dev)

```bash
npm install
npm run dev          # http://localhost:5173
```

---

## Project structure

```
dreami-landing/
├── public/
│   ├── images/                  # App screenshots, icon, OG image, badges
│   │   ├── icon.png             # App icon (512×512 or larger)
│   │   ├── apple-touch-icon.png # 180×180
│   │   ├── og-image.png         # 1200×630 — used for social sharing previews
│   │   ├── screenshot-hero.png  # Shown in the hero section
│   │   └── download-ios.svg     # App Store badge (get from Apple)
│   ├── favicon.png
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── App.jsx                  # Hash-based routing (home / #/privacy / #/terms)
│   ├── main.jsx
│   ├── styles.css               # All styles — dreAmI dark/cosmic theme
│   └── components/
│       ├── Wordmark.jsx         # dreAmI + LeMaNg LLC mixed-case wordmarks
│       ├── StarField.jsx        # Animated canvas star field
│       ├── Navbar.jsx
│       ├── Hero.jsx
│       ├── Features.jsx
│       ├── PrivacySection.jsx
│       ├── FAQ.jsx              # SEO/LLM-optimised Q&A
│       ├── Download.jsx
│       ├── Footer.jsx
│       ├── PrivacyPolicy.jsx
│       └── TermsOfService.jsx
├── deploy.sh                    # Build + S3 sync + CloudFront invalidation
├── vite.config.js
└── package.json
```

---

## Assets checklist — add these before deploying

| File | Size | Notes |
|------|------|-------|
| `public/favicon.png` | 64×64+ | App icon works fine |
| `public/apple-touch-icon.png` | 180×180 | Used when added to home screen |
| `public/images/icon.png` | 512×512 | Navbar + footer logo |
| `public/images/og-image.png` | 1200×630 | Social preview card |
| `public/images/screenshot-hero.png` | ~390px wide | Main hero screenshot |
| `public/images/download-ios.svg` | — | Download from [Apple Marketing](https://developer.apple.com/app-store/marketing/guidelines/) |

After the app is live on the App Store, update the two `href` placeholders:

```
src/components/Hero.jsx    → href="https://apps.apple.com/app/dreami/idYOUR_APP_ID"
src/components/Download.jsx → href="https://apps.apple.com/app/dreami/idYOUR_APP_ID"
```

Also update `index.html`:
```html
<meta name="apple-itunes-app" content="app-id=YOUR_APP_ID" />
```

And update `public/sitemap.xml` with the correct `<lastmod>` dates after each deploy.

---

## AWS setup (first time)

### Prerequisites

- AWS account with a user that has S3 + CloudFront + ACM + Route 53 permissions
- AWS CLI installed and configured (`aws configure`)
- Your domain (`lemang.llc`) already has a **hosted zone in Route 53**

```bash
brew install awscli   # macOS
aws configure         # enter Access Key ID, Secret, region: us-east-1, output: json
```

---

### Step 1 — Request an SSL certificate (ACM)

CloudFront requires certificates to be in **us-east-1** regardless of where your users are.

1. Open [ACM in us-east-1](https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1)
2. Click **Request** → **Request a public certificate**
3. Domain name: `dreami.lemang.llc`
4. Validation method: **DNS validation** (recommended)
5. Click **Request**
6. Click into the pending certificate, expand the domain, and click **Create records in Route 53** — ACM will add the CNAME validation record automatically
7. Wait 2–5 minutes for status to become **Issued**

Note the **Certificate ARN** — you'll need it in Step 3.

---

### Step 2 — Create the S3 bucket

The deploy script creates the bucket automatically on first run. If you prefer to do it manually:

```bash
# Create bucket
aws s3 mb s3://dreami-landing --region us-east-1

# Enable static website hosting
aws s3 website s3://dreami-landing \
  --index-document index.html \
  --error-document index.html

# Apply public-read policy
aws s3api put-bucket-policy \
  --bucket dreami-landing \
  --policy '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":"*",
      "Action":"s3:GetObject",
      "Resource":"arn:aws:s3:::dreami-landing/*"
    }]
  }'
```

---

### Step 3 — Create the CloudFront distribution

1. Open [CloudFront](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home)
2. Click **Create distribution**
3. **Origin domain**: paste the S3 *website* endpoint (find it in S3 → your bucket → Properties → Static website hosting). It looks like:
   ```
   dreami-landing.s3-website-us-east-1.amazonaws.com
   ```
   > ⚠️ Use the **website endpoint**, not the REST API endpoint. Do not select the bucket from the dropdown — paste the endpoint manually.
4. **Origin protocol policy**: HTTP only (S3 website endpoints don't support HTTPS)
5. **Viewer protocol policy**: Redirect HTTP to HTTPS
6. **Allowed HTTP methods**: GET, HEAD
7. **Cache policy**: CachingOptimized
8. **Alternate domain names (CNAMEs)**: `dreami.lemang.llc`
9. **Custom SSL certificate**: select the certificate you created in Step 1
10. **Default root object**: `index.html`
11. Click **Create distribution**

Wait ~5–10 minutes for the distribution to deploy. Note the **Distribution domain name** (e.g. `d1abc123xyz.cloudfront.net`) and the **Distribution ID** — you need both.

#### Optional: configure custom error responses (not needed for hash routing)

Because dreAmI uses hash-based routing (`#/privacy`, `#/terms`), the server always serves `index.html` and the browser handles routing. No CloudFront error page configuration is needed.

---

### Step 4 — Route 53 CNAME for dreami.lemang.llc

1. Open [Route 53](https://console.aws.amazon.com/route53/v2/hostedzones)
2. Click your **lemang.llc** hosted zone
3. Click **Create record**
4. Settings:
   | Field | Value |
   |-------|-------|
   | Record name | `dreami` |
   | Record type | **CNAME** |
   | Value | Your CloudFront domain, e.g. `d1abc123xyz.cloudfront.net` |
   | TTL | 300 |
5. Click **Create records**

> **Alternative — use an Alias record (recommended for AWS resources):**
> Instead of CNAME, choose **A** record type, enable **Alias**, and select **Alias to CloudFront distribution**. This is free (no DNS query charges) and slightly faster.

DNS propagation typically takes 1–5 minutes within Route 53, and up to 48 hours for full propagation (usually much faster).

---

### Step 5 — First deploy

Add your distribution ID to `deploy.sh`:

```bash
# In deploy.sh, line 13:
DISTRIBUTION_ID="${2:-E1YOURDISTRIBD}"
```

Then run:

```bash
./deploy.sh
```

The script will:
1. `npm install` + `npm run build`
2. Create the S3 bucket if it doesn't exist
3. Sync the `dist/` directory with appropriate cache headers
4. Invalidate the CloudFront cache

---

## Subsequent deploys

```bash
./deploy.sh
# or equivalently:
npm run deploy
```

The CloudFront cache invalidation (`/*`) ensures visitors see the latest version within ~1 minute.

---

## Making changes

| What changed | What to update |
|---|---|
| App Store URL goes live | Update two `href` values in `Hero.jsx` and `Download.jsx`; update `app-id` in `index.html` |
| New screenshots | Drop files in `public/images/`, update `src` props in components |
| App Store copy / description | Edit copy directly in the components |
| Privacy or Terms | Edit `PrivacyPolicy.jsx` or `TermsOfService.jsx` |
| Support email | Search for `support@lemang.llc` and replace |
| SEO metadata | Edit `index.html` meta tags + JSON-LD blocks |
| Sitemap dates | Update `<lastmod>` in `public/sitemap.xml` |

---

## URLs

| Page | URL |
|------|-----|
| Home | https://dreami.lemang.llc/ |
| Privacy Policy | https://dreami.lemang.llc/#/privacy |
| Terms of Service | https://dreami.lemang.llc/#/terms |
| Support email | support@lemang.llc |
