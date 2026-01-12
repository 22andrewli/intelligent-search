#!/usr/bin/env python3
"""
Web scraper using Playwright to extract all HCPCS codes from hcpcsdata.com
Playwright is easier to install than Selenium and handles dynamic content better.
"""
import sys
import json
import re
from typing import List, Dict
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("Playwright not installed. Install with: pip install playwright")
    print("Then run: playwright install chromium")

def categorize_code(code: str) -> str:
    """Categorize HCPCS code based on code pattern"""
    code_upper = code.upper().strip()
    
    if code_upper.startswith('A'):
        return "Medical and Surgical Supplies"
    elif code_upper.startswith('B'):
        return "Enteral and Parenteral Therapy"
    elif code_upper.startswith('C'):
        return "Temporary Codes"
    elif code_upper.startswith('D'):
        return "Dental Procedures"
    elif code_upper.startswith('E'):
        return "Durable Medical Equipment"
    elif code_upper.startswith('G'):
        return "Temporary Procedures/Professional Services"
    elif code_upper.startswith('H'):
        return "Alcohol and Drug Abuse Treatment Services"
    elif code_upper.startswith('J'):
        return "Drugs Administered Other Than Oral Method"
    elif code_upper.startswith('K'):
        return "Temporary Codes"
    elif code_upper.startswith('L'):
        return "Orthotic and Prosthetic Procedures"
    elif code_upper.startswith('M'):
        return "Medical Services"
    elif code_upper.startswith('P'):
        return "Pathology and Laboratory Services"
    elif code_upper.startswith('Q'):
        return "Temporary Codes"
    elif code_upper.startswith('R'):
        return "Diagnostic Radiology Services"
    elif code_upper.startswith('S'):
        return "Temporary National Codes"
    elif code_upper.startswith('T'):
        return "Temporary Codes"
    elif code_upper.startswith('U'):
        return "Clinical Laboratory Services"
    elif code_upper.startswith('V'):
        return "Vision Services"
    
    numeric_part = re.sub(r'[^\d]', '', code_upper[:5])
    if numeric_part:
        num = int(numeric_part)
        if 10000 <= num <= 19999:
            return "Integumentary System"
        elif 20000 <= num <= 29999:
            return "Musculoskeletal System"
        elif 30000 <= num <= 39999:
            return "Respiratory System"
        elif 40000 <= num <= 49999:
            return "Cardiovascular System"
        elif 50000 <= num <= 59999:
            return "Digestive System"
        elif 60000 <= num <= 69999:
            return "Urinary System"
        elif 70000 <= num <= 79999:
            return "Nervous System"
        elif 80000 <= num <= 89999:
            return "Pathology and Laboratory"
        elif 90000 <= num <= 99999:
            return "Evaluation and Management"
    
    return "Uncategorized"

def intercept_api_calls(page):
    """Intercept network requests to find API endpoints"""
    api_data = []
    
    def handle_response(response):
        url = response.url
        if 'api' in url.lower() or 'data' in url.lower() or 'codes' in url.lower():
            try:
                if 'json' in response.headers.get('content-type', ''):
                    data = response.json()
                    if isinstance(data, list) and len(data) > 100:
                        api_data.append(data)
                    elif isinstance(data, dict) and ('codes' in data or 'data' in data):
                        api_data.append(data.get('codes') or data.get('data'))
            except:
                pass
    
    page.on("response", handle_response)
    return api_data

def scrape_codes_from_page(page) -> List[Dict[str, str]]:
    """Scrape codes from the page"""
    codes = []
    
    # Wait for table or data to load
    try:
        # Try to wait for table
        page.wait_for_selector("table", timeout=10000)
    except:
        pass
    
    # Give page time to load all data
    page.wait_for_timeout(5000)
    
    # Try to find and click "Show all" or similar button
    try:
        # Look for buttons with various selectors
        selectors = [
            "button:has-text('All')",
            "button:has-text('Show')",
            "button:has-text('Load')",
            "a:has-text('All')",
            "a:has-text('Show')",
            "[data-action*='all']",
            "[data-action*='show']",
            ".btn:has-text('All')",
            ".btn:has-text('Show')",
        ]
        
        for selector in selectors:
            try:
                btn = page.query_selector(selector)
                if btn:
                    print(f"Clicking button: {btn.inner_text()}")
                    btn.click()
                    page.wait_for_timeout(3000)
                    break
            except:
                continue
        
        # Also try all buttons
        buttons = page.query_selector_all("button, a, [role='button']")
        for btn in buttons:
            try:
                text = btn.inner_text().lower()
                if any(word in text for word in ['all', 'show', 'load', 'export', 'download', 'view all']):
                    print(f"Clicking button: {btn.inner_text()}")
                    btn.click()
                    page.wait_for_timeout(3000)
                    break
            except:
                continue
    except:
        pass
    
    # Try infinite scroll to load all data
    print("Attempting to scroll to load all data...")
    try:
        last_height = page.evaluate("document.body.scrollHeight")
        scroll_attempts = 0
        max_scrolls = 50
        
        while scroll_attempts < max_scrolls:
            # Scroll to bottom
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)
            
            # Check if new content loaded
            new_height = page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
            scroll_attempts += 1
            
            if scroll_attempts % 10 == 0:
                print(f"  Scrolled {scroll_attempts} times...")
        
        print(f"Finished scrolling ({scroll_attempts} attempts)")
    except Exception as e:
        print(f"Error during scroll: {e}")
    
    # Method 1: Try to extract from table (with multiple attempts)
    all_rows = []
    try:
        # Try different table selectors
        table_selectors = [
            "table tr",
            "tbody tr",
            "[role='row']",
            ".table tr",
            "#codesTable tr",
            ".data-table tr",
        ]
        
        for selector in table_selectors:
            rows = page.query_selector_all(selector)
            if len(rows) > len(all_rows):
                all_rows = rows
                print(f"Found {len(rows)} rows using selector: {selector}")
        
        rows = all_rows
        if not rows:
            rows = page.query_selector_all("table tr")
            print(f"Found {len(rows)} table rows (fallback)")
        
        for i, row in enumerate(rows[1:], 1):  # Skip header
            try:
                cells = row.query_selector_all("td")
                if len(cells) >= 2:
                    code = cells[0].inner_text().strip()
                    name = cells[1].inner_text().strip()
                    category = cells[2].inner_text().strip() if len(cells) > 2 else None
                    
                    if code and name:
                        if not category:
                            category = categorize_code(code)
                        
                        codes.append({
                            'code': code,
                            'name': name,
                            'category': category
                        })
                        
                        if i % 100 == 0:
                            print(f"  Scraped {i} codes from table...")
            except:
                continue
    except Exception as e:
        print(f"Error scraping table: {e}")
    
    # Method 2: Try to extract from JavaScript data
    try:
        # Execute JavaScript to get data from window object
        js_data = page.evaluate("""
            () => {
                if (window.codesData) return window.codesData;
                if (window.data && Array.isArray(window.data)) return window.data;
                if (window.hcpcsCodes) return window.hcpcsCodes;
                if (window.codes && Array.isArray(window.codes)) return window.codes;
                return null;
            }
        """)
        
        if js_data:
            print(f"Found data in window object: {len(js_data)} items")
            for item in js_data:
                if isinstance(item, dict):
                    code = item.get('code') or item.get('Code') or item.get('HCPCS')
                    name = item.get('name') or item.get('Name') or item.get('Description')
                    if code and name:
                        codes.append({
                            'code': str(code).strip(),
                            'name': str(name).strip(),
                            'category': categorize_code(str(code))
                        })
    except:
        pass
    
    # Method 3: Look for JSON in script tags
    try:
        scripts = page.query_selector_all("script")
        for script in scripts:
            content = script.inner_text()
            if content:
                json_matches = re.findall(r'var\s+\w+\s*=\s*(\[.*?\]);', content, re.DOTALL)
                for match in json_matches:
                    try:
                        data = json.loads(match)
                        if isinstance(data, list) and len(data) > 100:
                            print(f"Found JSON data in script: {len(data)} items")
                            for item in data:
                                if isinstance(item, dict):
                                    code = item.get('code') or item.get('Code') or item.get('HCPCS')
                                    name = item.get('name') or item.get('Name') or item.get('Description')
                                    if code and name:
                                        codes.append({
                                            'code': str(code).strip(),
                                            'name': str(name).strip(),
                                            'category': categorize_code(str(code))
                                        })
                    except:
                        continue
    except:
        pass
    
    return codes

def generate_typescript(codes: List[Dict[str, str]], output_file: str = "src/data/hcpcs_codes.ts"):
    """Generate TypeScript file from codes data"""
    
    if not codes:
        print("No codes to generate!")
        return
    
    # Remove duplicates
    seen = set()
    unique_codes = []
    for code in codes:
        key = (code['code'], code['name'])
        if key not in seen:
            seen.add(key)
            unique_codes.append(code)
    
    # Group by category
    categories = {}
    for code in unique_codes:
        cat = code.get('category', 'Uncategorized')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(code)
    
    sorted_categories = sorted(categories.keys())
    
    ts_content = """// HCPCS/CPT Codes from hcpcsdata.com
export interface HCPCSCode {
  code: string;
  name: string;
  category: string;
}

export const hcpcsCodes: HCPCSCode[] = [
"""
    
    for category in sorted_categories:
        ts_content += f"\n  // {category}\n"
        for code in sorted(categories[category], key=lambda x: x['code']):
            name = code['name'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').replace('\r', '')
            code_str = code['code'].replace('"', '\\"')
            ts_content += f'  {{ code: "{code_str}", name: "{name}", category: "{category}" }},\n'
    
    ts_content += "\n];\n"
    
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    
    print(f"\n✓ Generated TypeScript file with {len(unique_codes)} codes in {len(categories)} categories")
    print(f"  Output: {output_path.absolute()}")

def main():
    if not HAS_PLAYWRIGHT:
        print("ERROR: Playwright is required for web scraping.")
        print("Install with: pip install playwright")
        print("Then run: playwright install chromium")
        sys.exit(1)
    
    print("Starting HCPCS codes scraper with Playwright...")
    print("=" * 50)
    
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        # Set up response interception
        api_responses = []
        
        def handle_response(response):
            url = response.url
            if any(keyword in url.lower() for keyword in ['api', 'data', 'codes', 'hcpcs']):
                try:
                    if 'json' in response.headers.get('content-type', ''):
                        data = response.json()
                        if isinstance(data, list) and len(data) > 100:
                            api_responses.append(('list', data))
                        elif isinstance(data, dict):
                            api_responses.append(('dict', data))
                except:
                    pass
        
        page.on("response", handle_response)
        
        try:
            print("Loading hcpcsdata.com/Codes...")
            try:
                page.goto("https://www.hcpcsdata.com/Codes", wait_until="domcontentloaded", timeout=30000)
            except:
                # If timeout, try with load event
                try:
                    page.goto("https://www.hcpcsdata.com/Codes", wait_until="load", timeout=30000)
                except:
                    print("Warning: Page load timeout, continuing anyway...")
            
            # Wait for dynamic content to load
            print("Waiting for content to load...")
            page.wait_for_timeout(8000)
            
            # Check if we got API responses
            if api_responses:
                print(f"Found {len(api_responses)} API responses")
                for resp_type, data in api_responses:
                    if resp_type == 'list' and len(data) > 100:
                        print(f"  Found list with {len(data)} items")
                    elif resp_type == 'dict':
                        print(f"  Found dict with keys: {list(data.keys())}")
            
            # Scrape from page
            print("Scraping codes from page...")
            codes = scrape_codes_from_page(page)
            
            if codes:
                print(f"\n✓ Successfully scraped {len(codes)} codes")
                generate_typescript(codes)
            else:
                print("\n✗ No codes found. The website structure may have changed.")
                print("Page title:", page.title())
                print("Page URL:", page.url)
                
        except Exception as e:
            print(f"\n✗ Error during scraping: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    print("\nScraping complete.")

if __name__ == "__main__":
    main()
