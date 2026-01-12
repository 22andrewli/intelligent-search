#!/usr/bin/env python3
"""
Web scraper to extract all HCPCS codes from hcpcsdata.com
by scraping each category page (A, B, C, E, G, H, J, K, L, M, P, Q, R, S, T, U, V)
"""
import sys
import time
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

# All category letters
CATEGORIES = ['A', 'B', 'C', 'E', 'G', 'H', 'J', 'K', 'L', 'M', 'P', 'Q', 'R', 'S', 'T', 'U', 'V']

def categorize_code(code: str) -> str:
    """Categorize HCPCS code based on code pattern"""
    code_upper = code.upper().strip()
    
    category_map = {
        'A': "Medical and Surgical Supplies",
        'B': "Enteral and Parenteral Therapy",
        'C': "Temporary Codes",
        'D': "Dental Procedures",
        'E': "Durable Medical Equipment",
        'G': "Temporary Procedures/Professional Services",
        'H': "Alcohol and Drug Abuse Treatment Services",
        'J': "Drugs Administered Other Than Oral Method",
        'K': "Temporary Codes",
        'L': "Orthotic and Prosthetic Procedures",
        'M': "Medical Services",
        'P': "Pathology and Laboratory Services",
        'Q': "Temporary Codes",
        'R': "Diagnostic Radiology Services",
        'S': "Temporary National Codes",
        'T': "Temporary Codes",
        'U': "Clinical Laboratory Services",
        'V': "Vision Services",
    }
    
    if code_upper and code_upper[0] in category_map:
        return category_map[code_upper[0]]
    
    # Numeric codes
    numeric_part = re.sub(r'[^\d]', '', code_upper[:5])
    if numeric_part:
        num = int(numeric_part)
        ranges = [
            (10000, 19999, "Integumentary System"),
            (20000, 29999, "Musculoskeletal System"),
            (30000, 39999, "Respiratory System"),
            (40000, 49999, "Cardiovascular System"),
            (50000, 59999, "Digestive System"),
            (60000, 69999, "Urinary System"),
            (70000, 79999, "Nervous System"),
            (80000, 89999, "Pathology and Laboratory"),
            (90000, 99999, "Evaluation and Management"),
        ]
        for start, end, cat in ranges:
            if start <= num <= end:
                return cat
    
    return "Uncategorized"

def scrape_category_page(page, category: str) -> List[Dict[str, str]]:
    """Scrape codes from a specific category page"""
    url = f"https://www.hcpcsdata.com/Codes/{category}"
    codes = []
    
    try:
        print(f"  Loading {url}...")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)  # Wait for content to load
        
        # Try to find table rows
        rows = page.query_selector_all("table tr, tbody tr")
        print(f"  Found {len(rows)} rows")
        
        for i, row in enumerate(rows[1:], 1):  # Skip header
            try:
                cells = row.query_selector_all("td, th")
                if len(cells) >= 2:
                    code = cells[0].inner_text().strip()
                    name = cells[1].inner_text().strip()
                    
                    # Skip empty rows or summary rows
                    if not code or not name:
                        continue
                    
                    # Skip rows that are clearly not codes (like "'X' Codes" summaries)
                    if code.startswith("'") and code.endswith(" Codes"):
                        continue
                    if code.isdigit() and len(code) > 4:  # Likely a count
                        continue
                    if len(code) < 2:  # Too short
                        continue
                    
                    # Determine category
                    category_name = categorize_code(code)
                    
                    codes.append({
                        'code': code,
                        'name': name,
                        'category': category_name
                    })
                    
                    if i % 50 == 0:
                        print(f"    Processed {i} rows, found {len(codes)} codes...")
            except Exception as e:
                continue
        
        print(f"  ✓ Extracted {len(codes)} codes from category {category}")
        
    except Exception as e:
        print(f"  ✗ Error scraping category {category}: {e}")
    
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
    
    # Group by category for better organization
    categories = {}
    for code in unique_codes:
        cat = code.get('category', 'Uncategorized')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(code)
    
    # Sort categories alphabetically
    sorted_categories = sorted(categories.keys())
    
    ts_content = """// HCPCS/CPT Codes from hcpcsdata.com
export interface HCPCSCode {
  code: string;
  name: string;
  category: string;
}

export const hcpcsCodes: HCPCSCode[] = [
"""
    
    # Write codes grouped by category
    for category in sorted_categories:
        ts_content += f"\n  // {category}\n"
        for code in sorted(categories[category], key=lambda x: x['code']):
            # Escape quotes and special characters in name
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
        print("ERROR: Playwright is required.")
        print("Install with: pip install playwright && playwright install chromium")
        sys.exit(1)
    
    print("HCPCS Codes Scraper - Category Pages")
    print("=" * 50)
    print(f"Scraping {len(CATEGORIES)} category pages...\n")
    
    all_codes = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        try:
            for i, category in enumerate(CATEGORIES, 1):
                print(f"[{i}/{len(CATEGORIES)}] Scraping category {category}...")
                category_codes = scrape_category_page(page, category)
                all_codes.extend(category_codes)
                print(f"  Total codes so far: {len(all_codes)}\n")
                
                # Small delay between requests
                time.sleep(1)
            
            if all_codes:
                print(f"\n✓ Successfully scraped {len(all_codes)} total codes")
                generate_typescript(all_codes)
            else:
                print("\n✗ No codes found")
                
        except KeyboardInterrupt:
            print("\n\nScraping interrupted by user")
            if all_codes:
                print(f"Saving {len(all_codes)} codes found so far...")
                generate_typescript(all_codes)
        except Exception as e:
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()
            if all_codes:
                print(f"\nSaving {len(all_codes)} codes found before error...")
                generate_typescript(all_codes)
        finally:
            browser.close()
    
    print("\nDone!")

if __name__ == "__main__":
    main()
