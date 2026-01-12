# HCPCS Codes Web Scraper

This directory contains web scrapers to extract HCPCS codes from hcpcsdata.com.

## Current Status

The website at hcpcsdata.com loads data dynamically via JavaScript, and the current scrapers are only able to extract a limited number of codes (17) from the initial page load. The full dataset of 8,623 codes appears to be loaded via AJAX/API calls that are not easily accessible.

## Available Scripts

1. **scrape_hcpcs_final.py** - Main scraper using Playwright (recommended)
2. **scrape_hcpcs_playwright.py** - Alternative Playwright implementation
3. **scrape_hcpcs_simple.py** - Simple requests-based scraper (limited functionality)

## Installation

```bash
pip install playwright beautifulsoup4 lxml
playwright install chromium
```

## Usage

```bash
python scrape_hcpcs_final.py
```

## Troubleshooting

If the scraper only finds a few codes:

1. **Check the website structure**: The site may use DataTables.js or similar library that loads data via AJAX
2. **Find the API endpoint**: Use browser DevTools (Network tab) to identify the API call that loads all codes
3. **Manual interaction**: The site may require clicking "Show All" or similar buttons
4. **Pagination**: The data may be paginated and require clicking through pages

## Next Steps

To get all 8,623 codes, you may need to:

1. **Identify the API endpoint**: 
   - Open hcpcsdata.com/Codes in a browser
   - Open DevTools → Network tab
   - Look for XHR/fetch requests that return JSON data
   - Update the scraper to call that endpoint directly

2. **Use browser automation with manual steps**:
   - Run the scraper in non-headless mode
   - Manually interact with the page to load all data
   - Then extract the data

3. **Contact the website**: They may provide a CSV/Excel download option

## Alternative: Manual Download

If scraping proves difficult, you can:
1. Visit https://www.hcpcsdata.com/Codes
2. Download the data as CSV/Excel
3. Use a script to convert it to TypeScript format
