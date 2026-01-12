#!/usr/bin/env python3
"""
Alternative web scraper using requests and BeautifulSoup
for hcpcsdata.com that doesn't require Selenium.
"""
import sys
import requests
import time
import json
import re
from typing import List, Dict
from pathlib import Path

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    print("BeautifulSoup4 not installed. Install with: pip install beautifulsoup4 lxml")

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
    
    # Level I CPT codes (numeric)
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

def find_api_endpoint(session: requests.Session) -> str:
    """Try to find the API endpoint that serves the codes"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.hcpcsdata.com/Codes',
    }
    
    # Common API patterns to try
    base_url = "https://www.hcpcsdata.com"
    endpoints = [
        "/api/codes",
        "/api/Codes",
        "/api/GetCodes",
        "/Codes/GetAll",
        "/api/HCPCS",
        "/data/codes.json",
    ]
    
    for endpoint in endpoints:
        try:
            url = base_url + endpoint
            r = session.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                content_type = r.headers.get('content-type', '')
                if 'json' in content_type:
                    try:
                        data = r.json()
                        if isinstance(data, list) and len(data) > 100:
                            print(f"Found API endpoint: {url}")
                            return url
                        elif isinstance(data, dict) and ('codes' in data or 'data' in data):
                            print(f"Found API endpoint: {url}")
                            return url
                    except:
                        pass
        except:
            continue
    
    return None

def scrape_from_html(session: requests.Session) -> List[Dict[str, str]]:
    """Scrape codes from HTML page"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    
    codes = []
    
    try:
        r = session.get("https://www.hcpcsdata.com/Codes", headers=headers, timeout=30)
        r.raise_for_status()
        
        soup = BeautifulSoup(r.text, 'lxml')
        
        # Look for table
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows[1:]:  # Skip header
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    code = cells[0].get_text(strip=True)
                    name = cells[1].get_text(strip=True)
                    category = cells[2].get_text(strip=True) if len(cells) > 2 else None
                    
                    if code and name:
                        if not category:
                            category = categorize_code(code)
                        
                        codes.append({
                            'code': code,
                            'name': name,
                            'category': category
                        })
        
        # Also look for JSON data in script tags
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string:
                # Look for JSON arrays
                json_matches = re.findall(r'var\s+\w+\s*=\s*(\[.*?\]);', script.string, re.DOTALL)
                for match in json_matches:
                    try:
                        data = json.loads(match)
                        if isinstance(data, list) and len(data) > 0:
                            if isinstance(data[0], dict):
                                first_item = data[0]
                                if any(k.lower() in ['code', 'hcpcs'] for k in first_item.keys()):
                                    print(f"Found JSON data in script: {len(data)} items")
                                    for item in data:
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
        
    except Exception as e:
        print(f"Error scraping HTML: {e}")
    
    return codes

def generate_typescript(codes: List[Dict[str, str]], output_file: str = "src/data/hcpcs_codes.ts"):
    """Generate TypeScript file from codes data"""
    
    if not codes:
        print("No codes to generate!")
        return
    
    # Group codes by category
    categories = {}
    for code in codes:
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
    
    print(f"\n✓ Generated TypeScript file with {len(codes)} codes in {len(categories)} categories")
    print(f"  Output: {output_path.absolute()}")

def main():
    if not HAS_BS4:
        print("ERROR: BeautifulSoup4 is required.")
        print("Install with: pip install beautifulsoup4 lxml")
        sys.exit(1)
    
    print("Starting HCPCS codes scraper (simple version)...")
    print("=" * 50)
    
    session = requests.Session()
    codes = []
    
    # Try to find API endpoint first
    print("Looking for API endpoint...")
    api_url = find_api_endpoint(session)
    
    if api_url:
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
            r = session.get(api_url, headers=headers, timeout=30)
            data = r.json()
            
            if isinstance(data, list):
                codes_data = data
            elif isinstance(data, dict):
                codes_data = data.get('codes') or data.get('data') or []
            else:
                codes_data = []
            
            for item in codes_data:
                if isinstance(item, dict):
                    code = item.get('code') or item.get('Code') or item.get('HCPCS')
                    name = item.get('name') or item.get('Name') or item.get('Description')
                    if code and name:
                        codes.append({
                            'code': str(code).strip(),
                            'name': str(name).strip(),
                            'category': categorize_code(str(code))
                        })
            
            print(f"✓ Found {len(codes)} codes via API")
        except Exception as e:
            print(f"Error fetching from API: {e}")
    
    # If API didn't work, scrape from HTML
    if len(codes) < 100:
        print("Scraping from HTML page...")
        html_codes = scrape_from_html(session)
        if html_codes:
            codes.extend(html_codes)
            print(f"✓ Found {len(html_codes)} codes from HTML")
    
    if codes:
        # Remove duplicates
        seen = set()
        unique_codes = []
        for code in codes:
            code_key = (code['code'], code['name'])
            if code_key not in seen:
                seen.add(code_key)
                unique_codes.append(code)
        
        print(f"\n✓ Total unique codes: {len(unique_codes)}")
        generate_typescript(unique_codes)
    else:
        print("\n✗ No codes found. The website may require JavaScript to load data.")
        print("Try using scrape_hcpcs_codes.py with Selenium instead.")

if __name__ == "__main__":
    main()
