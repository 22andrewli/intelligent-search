#!/usr/bin/env python3
"""
Web scraper to extract all HCPCS codes from hcpcsdata.com
and generate the TypeScript file.

This script uses Selenium to handle dynamic content loading.
"""
import sys
import time
import json
import re
from typing import List, Dict, Optional
from pathlib import Path

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False
    print("Selenium not installed. Install with: pip install selenium")
    print("Also install ChromeDriver: brew install chromedriver (on macOS)")

def categorize_code(code: str) -> str:
    """
    Categorize HCPCS code based on code pattern
    """
    code_upper = code.upper().strip()
    
    # Level II HCPCS codes (A-V codes)
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
    
    # Level I CPT codes (numeric)
    if code_upper.replace('.', '').isdigit() or (len(code_upper) >= 1 and code_upper[0].isdigit()):
        # Extract numeric part
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
            elif 100000 <= num <= 199999:
                return "Anesthesia"
            elif 200000 <= num <= 299999:
                return "Radiology"
            elif 300000 <= num <= 399999:
                return "Medicine"
            elif 400000 <= num <= 499999:
                return "Surgery"
            elif 500000 <= num <= 599999:
                return "Physical Medicine"
            elif 600000 <= num <= 699999:
                return "Emergency Medicine"
            elif 700000 <= num <= 799999:
                return "Critical Care"
            elif 800000 <= num <= 899999:
                return "Preventive Medicine"
            elif 900000 <= num <= 999999:
                return "Psychiatry"
    
    return "Uncategorized"

def setup_driver(headless: bool = True):
    """Setup Chrome WebDriver"""
    options = Options()
    if headless:
        options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        print(f"Error setting up Chrome driver: {e}")
        print("\nMake sure ChromeDriver is installed:")
        print("  macOS: brew install chromedriver")
        print("  Linux: sudo apt-get install chromium-chromedriver")
        print("  Or download from: https://chromedriver.chromium.org/")
        return None

def scrape_codes_from_table(driver) -> List[Dict[str, str]]:
    """Scrape codes from HTML table"""
    codes = []
    
    try:
        # Wait for table to load
        wait = WebDriverWait(driver, 20)
        table = wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
        
        # Get all rows
        rows = table.find_elements(By.TAG_NAME, "tr")
        print(f"Found {len(rows)} rows in table")
        
        for i, row in enumerate(rows[1:], 1):  # Skip header
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) >= 2:
                    code = cells[0].text.strip()
                    name = cells[1].text.strip()
                    category = cells[2].text.strip() if len(cells) > 2 else None
                    
                    if code and name:
                        if not category:
                            category = categorize_code(code)
                        
                        codes.append({
                            'code': code,
                            'name': name,
                            'category': category
                        })
                        
                        if i % 100 == 0:
                            print(f"  Scraped {i} codes...")
            except Exception as e:
                print(f"  Error processing row {i}: {e}")
                continue
                
    except TimeoutException:
        print("Timeout waiting for table to load")
    except Exception as e:
        print(f"Error scraping table: {e}")
    
    return codes

def scrape_codes_from_api(driver) -> Optional[List[Dict[str, str]]]:
    """Try to intercept API calls or find data in page"""
    codes = []
    
    try:
        # Get page source and look for JSON data
        page_source = driver.page_source
        
        # Look for JSON data in script tags
        json_pattern = r'var\s+\w+\s*=\s*(\[.*?\]);'
        matches = re.findall(json_pattern, page_source, re.DOTALL)
        
        for match in matches:
            try:
                data = json.loads(match)
                if isinstance(data, list) and len(data) > 0:
                    if isinstance(data[0], dict):
                        # Check if it looks like HCPCS data
                        first_item = data[0]
                        if any(key.lower() in ['code', 'hcpcs', 'description', 'name'] for key in first_item.keys()):
                            print(f"Found JSON data with {len(data)} items")
                            return process_json_data(data)
            except:
                continue
        
        # Look for data in window object
        try:
            data = driver.execute_script("""
                if (window.codesData) return window.codesData;
                if (window.data) return window.data;
                if (window.hcpcsCodes) return window.hcpcsCodes;
                return null;
            """)
            if data:
                print(f"Found data in window object: {len(data) if isinstance(data, list) else 'object'}")
                return process_json_data(data if isinstance(data, list) else [data])
        except:
            pass
            
    except Exception as e:
        print(f"Error looking for API data: {e}")
    
    return None

def process_json_data(data: List[Dict]) -> List[Dict[str, str]]:
    """Process JSON data into standardized format"""
    codes = []
    
    for item in data:
        if isinstance(item, dict):
            code = item.get('code') or item.get('Code') or item.get('HCPCS') or item.get('hcpcs') or item.get('HcpcsCode')
            name = item.get('name') or item.get('Name') or item.get('Description') or item.get('description') or item.get('LongDescription')
            category = item.get('category') or item.get('Category') or item.get('Type') or item.get('type') or item.get('CategoryName')
            
            if code and name:
                if not category:
                    category = categorize_code(str(code))
                
                codes.append({
                    'code': str(code).strip(),
                    'name': str(name).strip(),
                    'category': str(category).strip()
                })
    
    return codes

def scrape_with_pagination(driver) -> List[Dict[str, str]]:
    """Scrape codes with pagination"""
    codes = []
    page = 1
    
    try:
        while True:
            print(f"Scraping page {page}...")
            
            # Wait for table
            wait = WebDriverWait(driver, 10)
            table = wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
            
            # Scrape current page
            rows = table.find_elements(By.TAG_NAME, "tr")
            page_codes = []
            
            for row in rows[1:]:  # Skip header
                try:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 2:
                        code = cells[0].text.strip()
                        name = cells[1].text.strip()
                        category = cells[2].text.strip() if len(cells) > 2 else None
                        
                        if code and name:
                            if not category:
                                category = categorize_code(code)
                            
                            page_codes.append({
                                'code': code,
                                'name': name,
                                'category': category
                            })
                except:
                    continue
            
            codes.extend(page_codes)
            print(f"  Found {len(page_codes)} codes on page {page} (total: {len(codes)})")
            
            # Try to find next button
            try:
                next_button = driver.find_element(By.XPATH, "//a[contains(text(), 'Next') or contains(@class, 'next')]")
                if not next_button.is_enabled() or 'disabled' in next_button.get_attribute('class'):
                    break
                next_button.click()
                time.sleep(2)  # Wait for page to load
                page += 1
            except NoSuchElementException:
                # No pagination, try to load all
                try:
                    # Look for "Show all" or "Load all" button
                    show_all = driver.find_element(By.XPATH, "//button[contains(text(), 'All') or contains(text(), 'Show')]")
                    show_all.click()
                    time.sleep(3)
                    # Re-scrape the full table
                    return scrape_codes_from_table(driver)
                except:
                    break
                    
    except Exception as e:
        print(f"Error during pagination: {e}")
    
    return codes

def generate_typescript(codes: List[Dict[str, str]], output_file: str = "src/data/hcpcs_codes.ts"):
    """Generate TypeScript file from codes data"""
    
    if not codes:
        print("No codes to generate!")
        return
    
    # Group codes by category for better organization
    categories = {}
    for code in codes:
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
            # Escape quotes and backslashes in name
            name = code['name'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').replace('\r', '')
            code_str = code['code'].replace('"', '\\"')
            ts_content += f'  {{ code: "{code_str}", name: "{name}", category: "{category}" }},\n'
    
    ts_content += "\n];\n"
    
    # Write to file
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    
    print(f"\n✓ Generated TypeScript file with {len(codes)} codes in {len(categories)} categories")
    print(f"  Output: {output_path.absolute()}")

def main():
    if not HAS_SELENIUM:
        print("ERROR: Selenium is required for web scraping.")
        print("Install with: pip install selenium")
        print("Also install ChromeDriver:")
        print("  macOS: brew install chromedriver")
        print("  Or download from: https://chromedriver.chromium.org/")
        sys.exit(1)
    
    print("Starting HCPCS codes scraper...")
    print("=" * 50)
    
    driver = setup_driver(headless=True)
    if not driver:
        sys.exit(1)
    
    try:
        print("Loading hcpcsdata.com/Codes...")
        driver.get("https://www.hcpcsdata.com/Codes")
        
        # Wait a bit for page to load
        time.sleep(5)
        
        # Try to find data via API first
        print("Looking for API data...")
        codes = scrape_codes_from_api(driver)
        
        if not codes or len(codes) < 100:
            print("API data not found, scraping from table...")
            # Try to load all data (look for "Show all" or similar)
            try:
                show_all_buttons = driver.find_elements(By.XPATH, "//button | //a")
                for btn in show_all_buttons:
                    text = btn.text.lower()
                    if 'all' in text or 'show' in text or 'load' in text or 'export' in text:
                        print(f"Clicking button: {btn.text}")
                        btn.click()
                        time.sleep(5)
                        break
            except:
                pass
            
            # Scrape from table
            codes = scrape_codes_from_table(driver)
            
            # If we got fewer codes than expected, try pagination
            if len(codes) < 5000:
                print(f"Only found {len(codes)} codes, trying pagination...")
                codes = scrape_with_pagination(driver)
        
        if codes:
            print(f"\n✓ Successfully scraped {len(codes)} codes")
            generate_typescript(codes)
        else:
            print("\n✗ No codes found. The website structure may have changed.")
            print("You may need to update the scraper.")
            
    except Exception as e:
        print(f"\n✗ Error during scraping: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.quit()
        print("\nScraping complete.")

if __name__ == "__main__":
    main()
