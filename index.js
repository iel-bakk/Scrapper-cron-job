// index.js
// Fetches kamas prices from leskamas.com and extracts MAD (Dhs) prices per server
// Stores data to Neon PostgreSQL
// Run: node index.js

const cheerio = require('cheerio');
const { initializeNeon, createTablesIfNotExist, storeKamasData, closeConnection } = require('./neon');

// These rows are section headers inside the table, not actual server data
const SECTION_HEADERS = [
  'dofus kamas',
  'dofus touch kamas',
  'dofus retro kamas',
  'wakfu kamas',
];

async function scrapeKamasPrices() {
  console.log('Fetching page...');

  const response = await fetch('https://www.leskamas.com/en-gb/sell-kamas.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });

  if (!response.ok) {
    throw new Error('HTTP error: ' + response.status);
  }

  const html = await response.text();
  console.log('Page fetched successfully');

  const $ = cheerio.load(html);
  const results = [];
  let currentCategory = 'Unknown';

  // Table columns:
  // [0] Server | [1] Paypal/Skrill | [2] Bitcoin | [3] Usdt | [4] Morocco(Dhs) | [5] Alipay | [6] Status

  $('table tr').each((i, row) => {
    if (i === 0) return; // skip header row

    const cells = $(row).find('td');
    if (cells.length === 0) return; // skip th-only rows

    const firstCell = $(cells[0]).text().trim();

    // Detect category section rows
    if (SECTION_HEADERS.includes(firstCell.toLowerCase())) {
      currentCategory = firstCell;
      return;
    }

    if (cells.length < 5 || !firstCell) return;

    const moroccoRaw = $(cells[4]).text().trim(); // e.g. "9.812 Dhs/M"
    const madMatch = moroccoRaw.match(/([\d.]+)\s*Dhs\/M/i);
    if (!madMatch) return;

    results.push({
      category:        currentCategory,
      server:          firstCell,
      mad_per_million: parseFloat(madMatch[1]),
      mad_display:     moroccoRaw,
      paypal:          $(cells[1]).text().trim(),
      bitcoin:         $(cells[2]).text().trim(),
      usdt:            $(cells[3]).text().trim(),
      alipay:          $(cells[5]).text().trim(),
      status:          $(cells[6]).text().trim(),
      scraped_at:      new Date().toISOString(),
    });
  });

  return results;
}

/**
 * Main execution function
 * Scrapes data and stores it to Neon PostgreSQL
 */
async function main() {
  try {
    console.log('Starting Kamas price scraper...\n');
    
    // Initialize Neon connection
    initializeNeon();
    
    // Create tables if needed
    await createTablesIfNotExist();
    
    // Scrape data
    const data = await scrapeKamasPrices();
    
    if (data.length === 0) {
      console.error('No data found. The page structure may have changed.');
      await closeConnection();
      process.exit(1);
    }

    console.log('\nFound ' + data.length + ' servers\n');

    // Filter to only store Mikhal server data
    const mikhalData = data.filter(item => item.server.toLowerCase() === 'mikhal');

    if (mikhalData.length === 0) {
      console.warn('⚠️  Mikhal server not found in scraped data');
      await closeConnection();
      process.exit(0);
    }

    console.log('Filtered to Mikhal server: ' + mikhalData.length + ' record(s)\n');

    // Display results in console
    const byCategory = {};
    mikhalData.forEach(item => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    });

    Object.entries(byCategory).forEach(([category, servers]) => {
      console.log('\n-- ' + category + ' --');
      console.log('Server           | MAD/Million     | Status');
      console.log('-----------------|-----------------|----------');
      servers.forEach(({ server, mad_display, status }) => {
        console.log(
          server.padEnd(16) + ' | ' + mad_display.padEnd(15) + ' | ' + status
        );
      });
    });

    // Store data to Neon
    console.log('\n\nStoring Mikhal data to Neon PostgreSQL...');
    await storeKamasData(mikhalData);
    
    await closeConnection();
    console.log('\n✓ Scraping and storage completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    await closeConnection();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for potential use as module
module.exports = { scrapeKamasPrices, storeKamasData: require('./neon').storeKamasData };