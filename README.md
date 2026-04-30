# Leskamas Scraper - GitHub Actions

An automated scraper that fetches KAMAS prices from leskamas.com every hour and stores them in Neon PostgreSQL.

## Features

- 🕐 Runs automatically every hour via GitHub Actions
- 📊 Scrapes real-time KAMAS prices from multiple servers
- 💾 Stores data in Neon PostgreSQL with historical records
- 🎯 Extracts MAD (Moroccan Dirham) prices per million
- ⚙️ Manual trigger available via GitHub UI

## Setup Instructions

### 1. Create Neon Project

1. Go to [Neon Console](https://console.neon.tech)
2. Sign up or log in
3. Create a new project (or use existing)
4. Create a new database (or use default)

### 2. Get Connection String

1. In Neon Console, go to your project
2. Click **Connection Strings** tab
3. Copy the **Connection string** (looks like: `postgresql://user:password@ep-xxx-us-east-1.neon.tech/...?sslmode=require`)
4. Keep this safe - it contains your credentials

### 3. Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name it: `DATABASE_URL`
5. Paste your Neon connection string from step 2
6. Click **Add secret**

### 4. Deploy to GitHub

1. Make sure your code is in a Git repository
2. Commit all files:
   ```bash
   git add .
   git commit -m "Add Kamas scraper with GitHub Actions and Neon"
   git push origin main
   ```
3. The workflow will automatically start running on the schedule

## Project Structure

```
├── index.js                          # Main scraper script
├── neon.js                           # Neon PostgreSQL integration
├── package.json                      # Project dependencies
├── .env.example                      # Environment variables template
├── .github/workflows/scrape.yml      # GitHub Actions workflow
└── README.md                         # This file
```

## Database Schema

The scraper automatically creates a `kamas_prices` table with the following structure:

```sql
CREATE TABLE kamas_prices (
  id SERIAL PRIMARY KEY,
  category VARCHAR(255),
  server VARCHAR(255),
  mad_per_million DECIMAL(10, 3),
  mad_display VARCHAR(255),
  paypal VARCHAR(255),
  bitcoin VARCHAR(255),
  usdt VARCHAR(255),
  alipay VARCHAR(255),
  status VARCHAR(100),
  scraped_at TIMESTAMP,
  stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Running Locally

If you want to test the scraper locally:

```bash
# Install dependencies
npm install

# Set environment variable (Linux/Mac)
export DATABASE_URL='postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require'

# Or set it from .env file: source .env

# Run the scraper
npm start
```

## Scheduling

The workflow runs on this schedule:
- **Every hour at the start of the hour** (0:00, 1:00, 2:00, etc. UTC)

To change the schedule, edit `.github/workflows/scrape.yml`:
```yaml
schedule:
  - cron: '0 * * * *'  # Format: minute hour day-of-month month day-of-week
```

### Common Cron Expressions

- `0 * * * *` - Every hour
- `0 6 * * *` - Daily at 6 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 09 * * 1-5` - Weekdays at 9 AM UTC

### Manual Trigger

1. Go to your repository
2. Click **Actions** tab
3. Select **Scrape and Store Kamas Prices** workflow
4. Click **Run workflow** dropdown
5. Click **Run workflow** button

## Data Queries

### Get latest prices for all servers

```sql
SELECT DISTINCT ON (server) * 
FROM kamas_prices 
ORDER BY server, created_at DESC;
```

### Get price history for a specific server

```sql
SELECT * 
FROM kamas_prices 
WHERE server = 'Ankama' 
ORDER BY created_at DESC 
LIMIT 100;
```

### Get average price per server over last 24 hours

```sql
SELECT 
  server, 
  ROUND(AVG(mad_per_million)::numeric, 3) as avg_price,
  COUNT(*) as samples
FROM kamas_prices
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY server
ORDER BY avg_price DESC;
```

## Troubleshooting

### Workflow fails to run

1. Check GitHub Actions tab for error messages
2. Verify `DATABASE_URL` secret is set correctly
3. Ensure it's the complete connection string (very long)

### Connection refused / SSL error

- Verify the connection string includes `?sslmode=require`
- Check that the Neon project is running (not paused)
- In Neon Console, try clicking **Resume** if the project is paused

### "No data found" error

- The website structure may have changed
- Check the console output in the GitHub Actions logs
- Website may be blocking requests - try adding delays

### Need help?

Check the GitHub Actions workflow logs:
1. Go to **Actions** tab
2. Click the failed workflow run
3. Click the **scrape** job
4. Check the **Run scraper** step output

## License

MIT

## Notes

- This project is for educational/personal use
- Be respectful of website resources - the current hourly schedule should be acceptable
- Ensure compliance with leskamas.com's terms of service
