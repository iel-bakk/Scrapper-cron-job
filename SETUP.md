# GitHub Setup Checklist

## Before Pushing to GitHub

### 1. ✓ Create GitHub Repository
- [ ] Go to github.com and create a new repository
- [ ] Name it: `leskamas-scraper` (or your preferred name)
- [ ] Initialize with NO files (don't add README, .gitignore as we have them)

### 2. ✓ Neon Setup
- [ ] Go to https://console.neon.tech
- [ ] Create a new project
- [ ] Create a database (or use the default `neondb`)
- [ ] Go to **Connection Strings** and copy the PostgreSQL connection string

### 3. ✓ GitHub Actions Secret
- [ ] In GitHub repo: Settings > Secrets and variables > Actions
- [ ] Create new secret named: `DATABASE_URL`
- [ ] Paste your Neon connection string as the value
- [ ] Connection string format: `postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require`

### 4. ✓ Local Setup
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Kamas scraper with GitHub Actions and Neon"

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/leskamas-scraper.git
git branch -M main

# Push to GitHub
git push -u origin main
```

### 5. ✓ Verify Setup
- [ ] Go to GitHub repository
- [ ] Check **Actions** tab - workflow should be ready to run
- [ ] Click "Run workflow" to test manually
- [ ] Check logs to see if it succeeded
- [ ] Workflow will run automatically every hour

## Files Created

- ✓ package.json - Dependencies (cheerio, pg)
- ✓ neon.js - Neon PostgreSQL integration
- ✓ index.js - Modified to use Neon
- ✓ .github/workflows/scrape.yml - GitHub Actions workflow
- ✓ .env.example - Template for environment variables
- ✓ .gitignore - Prevent committing sensitive files
- ✓ README.md - Complete documentation
- ✓ SETUP.md - This file!

## Environment Variable: DATABASE_URL

This is the only variable you need to set in GitHub Secrets.

Format: Neon PostgreSQL connection string
```
postgresql://user:password@ep-xxx-us-east-1.neon.tech/dbname?sslmode=require
```

**Where to find it:**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click **Connection Strings**
4. Copy the PostgreSQL connection string
5. Make sure `?sslmode=require` is included at the end

## Testing Locally (Optional)

```bash
# Install node modules
npm install

# Set environment variable
export DATABASE_URL='postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require'

# Test run
npm start
```

## How It Works

**Database Schema:**
- The scraper automatically creates a `kamas_prices` table on the first run
- Each scrape adds a new row with all the price data
- Historical data is preserved - perfect for tracking price trends

**Table Structure:**
- `id` - Auto-incrementing primary key
- `category` - Game category (DOFUS, Wakfu, etc.)
- `server` - Server name
- `mad_per_million` - Price in MAD per 1M kamas
- `mad_display` - Display format (e.g., "9.812 Dhs/M")
- `paypal`, `bitcoin`, `usdt`, `alipay` - Available payment methods
- `status` - Server status
- `scraped_at` - When we scraped the data
- `stored_at` - When we stored it to database
- `created_at` - Database timestamp

## Usage Examples

```bash
# Get latest prices for all servers
psql $DATABASE_URL -c "SELECT DISTINCT ON (server) server, mad_per_million, created_at FROM kamas_prices ORDER BY server, created_at DESC;"

# Get 24-hour average for each server
psql $DATABASE_URL -c "SELECT server, AVG(mad_per_million) as avg_price FROM kamas_prices WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY server ORDER BY avg_price DESC;"

# Check total records
psql $DATABASE_URL -c "SELECT COUNT(*) FROM kamas_prices;"
```

## Support

If the workflow fails:
1. Check GitHub Actions logs for error messages
2. Verify `DATABASE_URL` secret is set and complete
3. Confirm Neon project is running (not paused)
4. Make sure connection string includes `?sslmode=require`
