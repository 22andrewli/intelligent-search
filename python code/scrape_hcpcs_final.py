#!/usr/bin/env python3
"""
Final comprehensive web scraper for HCPCS codes from hcpcsdata.com
This script tries multiple methods to extract all codes.
"""
import sys
import json
import re
import time
from typing import List, Dict
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("Playwright not installed. Install with: pip install playwright")
    print("Then run: playwright install chromium")

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

def extract_all_codes(page) -> List[Dict[str, str]]:
    """Extract all codes using multiple methods"""
    codes = []
    
    print("Method 1: Extracting from table...")
    try:
        # Wait for table
        page.wait_for_selector("table", timeout=15000)
        time.sleep(3)  # Extra wait for data to populate
        
        # Try to find all rows
        rows = page.query_selector_all("table tr, tbody tr, [role='row']")
        print(f"  Found {len(rows)} rows")
        
        for i, row in enumerate(rows[1:], 1):  # Skip header
            try:
                cells = row.query_selector_all("td, th")
                if len(cells) >= 2:
                    code = cells[0].inner_text().strip()
                    name = cells[1].inner_text().strip()
                    
                    # Skip summary rows (rows that contain "'X' Codes" or just numbers)
                    if code.startswith("'") and code.endswith(" Codes"):
                        continue
                    if code.isdigit() and len(code) > 3:  # Likely a count, not a code
                        continue
                    if not code or len(code) < 2:  # Too short to be a valid code
                        continue
                    
                    # Valid HCPCS codes are typically 5 characters (alphanumeric)
                    # or start with a letter followed by numbers
                    if code and name and len(code) >= 2:
                        category = cells[2].inner_text().strip() if len(cells) > 2 else None
                        if not category:
                            category = categorize_code(code)
                        
                        codes.append({
                            'code': code,
                            'name': name,
                            'category': category
                        })
            except:
                continue
        
        print(f"  Extracted {len(codes)} codes from table")
    except Exception as e:
        print(f"  Error: {e}")
    
    # Method 2: Try to get data from JavaScript
    print("Method 2: Extracting from JavaScript data...")
    try:
        js_data = page.evaluate("""
            () => {
                const results = [];
                
                // Check window objects
                if (window.codesData && Array.isArray(window.codesData)) return window.codesData;
                if (window.data && Array.isArray(window.data)) return window.data;
                if (window.hcpcsCodes && Array.isArray(window.hcpcsCodes)) return window.hcpcsCodes;
                if (window.codes && Array.isArray(window.codes)) return window.codes;
                
                // Check DataTables if present
                if (window.$ && $.fn.dataTable) {
                    const tables = $('.dataTable, table').DataTable();
                    if (tables && tables.data) {
                        return tables.data().toArray();
                    }
                }
                
                // Try to find JSON in script tags
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const content = script.textContent || script.innerText;
                    if (content) {
                        const jsonMatch = content.match(/var\\s+\\w+\\s*=\\s*(\\[.*?\\]);/s);
                        if (jsonMatch) {
                            try {
                                const data = JSON.parse(jsonMatch[1]);
                                if (Array.isArray(data) && data.length > 100) {
                                    return data;
                                }
                            } catch(e) {}
                        }
                    }
                }
                
                return null;
            }
        """)
        
        if js_data:
            print(f"  Found JavaScript data: {len(js_data)} items")
            for item in js_data:
                if isinstance(item, dict):
                    code = item.get('code') or item.get('Code') or item.get('HCPCS') or item.get('HcpcsCode')
                    name = item.get('name') or item.get('Name') or item.get('Description') or item.get('LongDescription')
                    if code and name:
                        codes.append({
                            'code': str(code).strip(),
                            'name': str(name).strip(),
                            'category': categorize_code(str(code))
                        })
    except Exception as e:
        print(f"  Error: {e}")
    
    # Method 3: Try infinite scroll
    if len(codes) < 1000:
        print("Method 3: Attempting infinite scroll...")
        try:
            last_count = len(codes)
            for scroll in range(20):  # Max 20 scrolls
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
                
                # Re-extract
                new_rows = page.query_selector_all("table tr, tbody tr")
                if len(new_rows) > len(rows):
                    rows = new_rows
                    # Re-extract codes
                    new_codes = []
                    for row in rows[1:]:
                        try:
                            cells = row.query_selector_all("td")
                            if len(cells) >= 2:
                                code = cells[0].inner_text().strip()
                                name = cells[1].inner_text().strip()
                                if code and name:
                                    new_codes.append({
                                        'code': code,
                                        'name': name,
                                        'category': categorize_code(code)
                                    })
                        except:
                            continue
                    
                    codes = new_codes
                    if len(codes) == last_count:
                        break
                    last_count = len(codes)
                    print(f"  After scroll {scroll+1}: {len(codes)} codes")
        except Exception as e:
            print(f"  Error: {e}")
    
    return codes

def generate_typescript(codes: List[Dict[str, str]], output_file: str = "src/data/hcpcs_codes.ts"):
    """Generate TypeScript file"""
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
        print("ERROR: Playwright is required.")
        print("Install with: pip install playwright && playwright install chromium")
        sys.exit(1)
    
    print("HCPCS Codes Scraper")
    print("=" * 50)
    
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
            print("Loading page...")
            page.goto("https://www.hcpcsdata.com/Codes", wait_until="domcontentloaded", timeout=30000)
            
            print("Waiting for content to load...")
            time.sleep(10)  # Wait for dynamic content
            
            # Try to click any "show all" buttons
            try:
                buttons = page.query_selector_all("button, a, [role='button']")
                for btn in buttons[:20]:  # Check first 20 buttons
                    text = btn.inner_text().lower()
                    if any(word in text for word in ['all', 'show', 'load', 'view all', 'display all']):
                        print(f"Clicking: {btn.inner_text()}")
                        btn.click()
                        time.sleep(5)
                        break
            except:
                pass
            
            codes = extract_all_codes(page)
            
            if codes:
                generate_typescript(codes)
            else:
                print("\n✗ No codes found")
                print("The website structure may have changed or requires manual interaction.")
                
        except Exception as e:
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    print("\nDone!")

if __name__ == "__main__":
    main()
