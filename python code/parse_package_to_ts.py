#!/usr/bin/env python3
"""
Parse package.txt and generate ndc_codes.ts TypeScript file
"""

import csv
import re
from typing import List, Dict


def extract_package_size(description: str) -> str:
    """Extract package size information from package description"""
    if not description:
        return ""
    
    # Try to extract meaningful package size information
    # Examples: 
    # "1 VIAL, SINGLE-DOSE in 1 CARTON (0002-0152-01)  / .5 mL in 1 VIAL" -> ".5 mL"
    # "28 TABLET, FILM COATED in 1 BOTTLE (0002-1717-28)" -> "28 tablets"
    # "4 VIAL, SINGLE-DOSE in 1 CARTON (0002-0152-04)  / .5 mL in 1 VIAL" -> "4 vials, .5 mL"
    
    # First, try to get the volume/strength after the slash
    if '/' in description:
        parts = description.split('/')
        if len(parts) > 1:
            after_slash = parts[1].strip()
            # Extract volume/strength info
            volume_match = re.search(r'([\d.]+(?:\s*(?:mL|mg|units?|g|mcg|IU)))', after_slash, re.IGNORECASE)
            if volume_match:
                volume = volume_match.group(1).strip()
                # Also try to get the count from before the slash
                before_slash = parts[0].strip()
                count_match = re.search(r'^(\d+)\s+(?:VIAL|SYRINGE|PEN|TABLET|CAPSULE)', before_slash, re.IGNORECASE)
                if count_match:
                    count = count_match.group(1)
                    unit = re.search(r'(VIAL|SYRINGE|PEN|TABLET|CAPSULE|BOTTLE|CARTON)', before_slash, re.IGNORECASE)
                    unit_str = unit.group(1).lower() + ('s' if int(count) > 1 else '') if unit else ''
                    return f"{count} {unit_str}, {volume}".strip(', ')
                return volume
    
    # If no slash, try to extract count and unit
    count_match = re.search(r'^(\d+)\s+((?:TABLET|CAPSULE|VIAL|SYRINGE|PEN|BOTTLE|CARTON|CAN|PACKAGE|DOSE)[^/]*)', description, re.IGNORECASE)
    if count_match:
        count = count_match.group(1)
        unit_part = count_match.group(2).strip()
        # Clean up unit part
        unit_part = re.sub(r'\s*\([^)]+\)\s*', '', unit_part)  # Remove NDC codes in parentheses
        unit_part = re.sub(r'\s+', ' ', unit_part)
        return f"{count} {unit_part}"
    
    # Fallback: return first 60 chars, cleaned up
    cleaned = re.sub(r'\s+', ' ', description)
    cleaned = re.sub(r'\s*\([^)]+\)\s*', ' ', cleaned)  # Remove NDC codes in parentheses
    return cleaned[:60].strip() if cleaned else ""


def format_ndc_code(ndc_code: str) -> str:
    """Format NDC code with dashes"""
    # Remove any existing dashes and reformat
    clean = ndc_code.replace('-', '')
    if len(clean) == 11:
        return f"{clean[:5]}-{clean[5:9]}-{clean[9:]}"
    elif len(clean) == 10:
        return f"{clean[:4]}-{clean[4:8]}-{clean[8:]}"
    return ndc_code


def load_manufacturer_mapping(product_file: str) -> Dict[str, str]:
    """Load manufacturer mapping from product.txt"""
    manufacturer_map = {}
    
    print(f"Loading manufacturer data from {product_file}...", file=__import__('sys').stderr)
    
    try:
        with open(product_file, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row_num, row in enumerate(reader, start=2):
                if row_num % 10000 == 0:
                    print(f"Processed {row_num} product rows...", file=__import__('sys').stderr)
                
                product_ndc = row.get('PRODUCTNDC', '').strip()
                labeler_name = row.get('LABELERNAME', '').strip()
                ndc_exclude_flag = row.get('NDC_EXCLUDE_FLAG', '').strip()
                
                # Skip excluded products
                if ndc_exclude_flag == 'Y':
                    continue
                
                if product_ndc and labeler_name:
                    # Store the manufacturer for this product NDC
                    manufacturer_map[product_ndc] = labeler_name
        
        print(f"Loaded {len(manufacturer_map)} product-to-manufacturer mappings", file=__import__('sys').stderr)
    except FileNotFoundError:
        print(f"Warning: {product_file} not found, manufacturer data will be empty", file=__import__('sys').stderr)
    
    return manufacturer_map


def parse_package_file(input_file: str, manufacturer_map: Dict[str, str]) -> List[Dict]:
    """Parse package.txt and extract NDC codes"""
    ndc_codes = []
    
    print(f"Reading {input_file}...", file=__import__('sys').stderr)
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f, delimiter='\t')
        
        for row_num, row in enumerate(reader, start=2):
            if row_num % 10000 == 0:
                print(f"Processed {row_num} rows...", file=__import__('sys').stderr)
            
            ndc_package_code = row.get('NDCPACKAGECODE', '').strip()
            package_description = row.get('PACKAGEDESCRIPTION', '').strip()
            product_ndc = row.get('PRODUCTNDC', '').strip()
            ndc_exclude_flag = row.get('NDC_EXCLUDE_FLAG', '').strip()
            
            # Skip excluded codes
            if ndc_exclude_flag == 'Y':
                continue
            
            if not ndc_package_code or not package_description:
                continue
            
            # Format the NDC code
            formatted_code = format_ndc_code(ndc_package_code)
            
            # Extract package size
            package_size = extract_package_size(package_description)
            
            # Get manufacturer from mapping using PRODUCTNDC
            manufacturer = manufacturer_map.get(product_ndc, "")
            
            ndc_codes.append({
                'code': formatted_code,
                'name': package_description,
                'manufacturer': manufacturer,
                'packageSize': package_size
            })
    
    print(f"Found {len(ndc_codes)} NDC codes", file=__import__('sys').stderr)
    return ndc_codes


def generate_typescript(ndc_codes: List[Dict], output_file: str):
    """Generate TypeScript file from NDC codes"""
    print(f"Generating TypeScript file: {output_file}", file=__import__('sys').stderr)
    
    # Escape strings for TypeScript (handle newlines, quotes, backslashes)
    def escape_string(s: str) -> str:
        if not s:
            return ""
        # Replace backslashes first
        s = s.replace('\\', '\\\\')
        # Replace double quotes
        s = s.replace('"', '\\"')
        # Replace newlines
        s = s.replace('\n', '\\n').replace('\r', '\\r')
        # Replace tabs
        s = s.replace('\t', '\\t')
        return s
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('export interface NDCCode {\n')
        f.write('  code: string;\n')
        f.write('  name: string;\n')
        f.write('  manufacturer: string;\n')
        f.write('  packageSize: string;\n')
        f.write('}\n\n')
        f.write('export const ndcCodes: NDCCode[] = [\n')
        
        for i, code in enumerate(ndc_codes):
            comma = ',' if i < len(ndc_codes) - 1 else ''
            f.write(f'  {{ code: "{code["code"]}", name: "{escape_string(code["name"])}", manufacturer: "{escape_string(code["manufacturer"])}", packageSize: "{escape_string(code["packageSize"])}" }}{comma}\n')
        
        f.write('];\n')
    
    print(f"Successfully generated {output_file} with {len(ndc_codes)} codes", file=__import__('sys').stderr)


def main():
    input_file = '../src/data/package.txt'
    product_file = '../src/data/product.txt'
    output_file = '../src/data/ndc_codes.ts'
    
    try:
        # Load manufacturer mapping from product.txt
        manufacturer_map = load_manufacturer_mapping(product_file)
        
        # Parse package.txt with manufacturer mapping
        ndc_codes = parse_package_file(input_file, manufacturer_map)
        
        # Remove duplicates based on code
        seen = set()
        unique_codes = []
        for code in ndc_codes:
            if code['code'] not in seen:
                seen.add(code['code'])
                unique_codes.append(code)
        
        print(f"Removed {len(ndc_codes) - len(unique_codes)} duplicate codes", file=__import__('sys').stderr)
        print(f"Final count: {len(unique_codes)} unique codes", file=__import__('sys').stderr)
        
        # Sort by code
        unique_codes.sort(key=lambda x: x['code'])
        
        generate_typescript(unique_codes, output_file)
        
    except Exception as e:
        print(f"Error: {e}", file=__import__('sys').stderr)
        import traceback
        traceback.print_exc()
        __import__('sys').exit(1)


if __name__ == '__main__':
    main()
