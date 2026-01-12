#!/usr/bin/env python3
"""
Parse ICD-10-CM XML file and generate complete JSON hierarchy
"""

import json
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional
import sys


def get_code_level(code: str) -> int:
    """Determine the hierarchy level of a code"""
    # Remove dots for analysis
    clean_code = code.replace('.', '')
    if len(clean_code) <= 3:
        return 1  # Category level (e.g., A00)
    elif len(clean_code) <= 4:
        return 2  # Subcategory level (e.g., A00.0)
    elif len(clean_code) <= 5:
        return 3  # 5th character (e.g., A00.00)
    elif len(clean_code) <= 6:
        return 4  # 6th character (e.g., A00.000)
    else:
        return 5  # 7th character (e.g., A00.0000)


def parse_diag_element(diag_elem: ET.Element) -> Optional[Dict]:
    """Recursively parse diag elements from XML, preserving hierarchy"""
    name_elem = diag_elem.find('name')
    desc_elem = diag_elem.find('desc')
    
    if name_elem is None:
        return None
    
    code = name_elem.text.strip() if name_elem.text else ''
    desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ''
    
    if not code:
        return None
    
    # Get level for this code
    level = get_code_level(code)
    
    # Recursively process child diag elements
    children = {}
    for child_diag in diag_elem.findall('diag'):
        child_node = parse_diag_element(child_diag)
        if child_node:
            children[child_node['code']] = child_node
    
    # Create node
    node = {
        'code': code,
        'name': desc,
        'level': level,
        'children': children
    }
    
    return node


def serialize_node(node: Dict) -> Dict:
    """Recursively serialize node and children for JSON output"""
    result = {
        'code': node['code'],
        'name': node['name'],
        'level': node['level']
    }
    if node['children']:
        result['children'] = [serialize_node(child) for child in sorted(node['children'].values(), key=lambda x: x['code'])]
    return result


def main():
    xml_file = '../src/data/icd10cm-tabular-2026.xml'
    json_file = '../src/data/icd10cm_hierarchy.json'
    
    print(f"Parsing XML file: {xml_file}", file=sys.stderr)
    
    try:
        # Parse XML file
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # Find all sections and process their diag elements, preserving hierarchy
        hierarchy = {}
        total_codes = 0
        
        def count_codes(node):
            """Count total codes in a node and its children"""
            count = 1
            for child in node.get('children', {}).values():
                count += count_codes(child)
            return count
        
        # Find all sections and process their diag elements
        for section in root.findall('.//section'):
            for diag in section.findall('diag'):
                node = parse_diag_element(diag)
                if node:
                    hierarchy[node['code']] = node
                    total_codes += count_codes(node)
        
        print(f"Found {total_codes} total codes", file=sys.stderr)
        print(f"Found {len(hierarchy)} top-level codes", file=sys.stderr)
        
        # Serialize to JSON format
        print("Serializing to JSON...", file=sys.stderr)
        root_nodes = [serialize_node(node) for node in sorted(hierarchy.values(), key=lambda x: x['code'])]
        
        output = {
            'icd10cm': {
                'codes': root_nodes
            }
        }
        
        # Write JSON file
        print(f"Writing JSON file: {json_file}", file=sys.stderr)
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully generated JSON with {len(root_nodes)} top-level codes", file=sys.stderr)
        print(f"Total codes: {total_codes}", file=sys.stderr)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
