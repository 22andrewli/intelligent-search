#!/usr/bin/env python3
"""
ICD-10-CM Code Hierarchy Generator

This script creates a hierarchical XML/JSON representation of ICD-10-CM codes.
It uses the NLM Clinical Tables API to fetch ICD-10-CM code data and organizes
them into a tree structure.
"""

import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
import requests
from typing import Dict, List, Optional
import argparse
import sys


class ICD10CMHierarchy:
    """Builds and manages ICD-10-CM code hierarchy"""
    
    def __init__(self):
        self.codes = {}
        self.hierarchy = {}
        self.api_base = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"
        
    def fetch_code_data(self, code: str) -> Optional[Dict]:
        """Fetch data for a specific ICD-10-CM code from NLM API"""
        try:
            # Search for the code
            params = {
                'sf': 'code,name',
                'terms': code,
                'maxList': 1
            }
            response = requests.get(self.api_base, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 3 and data[3]:
                    code_data = data[3][0]
                    return {
                        'code': code_data[0],
                        'name': code_data[1] if len(code_data) > 1 else ''
                    }
        except Exception as e:
            print(f"Error fetching code {code}: {e}", file=sys.stderr)
        return None
    
    def get_code_level(self, code: str) -> int:
        """Determine the hierarchy level of a code"""
        # Remove dots for analysis
        clean_code = code.replace('.', '')
        if len(clean_code) <= 3:
            return 1  # Category level (e.g., A00)
        elif len(clean_code) <= 4:
            return 2  # Subcategory level
        elif len(clean_code) <= 5:
            return 3  # 5th character
        elif len(clean_code) <= 6:
            return 4  # 6th character
        else:
            return 5  # 7th character
    
    def get_parent_code(self, code: str, available_codes: set) -> Optional[str]:
        """Get the parent code in the hierarchy"""
        clean_code = code.replace('.', '')
        
        # For codes longer than 3 characters, find the parent by removing characters
        if len(clean_code) > 3:
            # Try different parent levels
            # First try removing last character
            for i in range(len(clean_code) - 1, 2, -1):
                parent_clean = clean_code[:i]
                # Try with and without dot
                parent_with_dot = parent_clean[:3] + '.' + parent_clean[3:] if len(parent_clean) > 3 else parent_clean
                parent_no_dot = parent_clean
                
                # Check if parent exists in available codes
                if parent_with_dot in available_codes:
                    return parent_with_dot
                if parent_no_dot in available_codes:
                    return parent_no_dot
            
            # If no exact match, construct parent (3-char base)
            if len(clean_code) >= 3:
                return clean_code[:3]
        
        # Top level codes (3 characters) have no parent
        return None
    
    def build_hierarchy_from_codes(self, codes: List[str]) -> Dict:
        """Build hierarchy from a list of codes"""
        # First, fetch all code data
        print("Fetching code data...", file=sys.stderr)
        available_codes = set(codes)
        
        for code in codes:
            if code not in self.codes:
                data = self.fetch_code_data(code)
                if data:
                    self.codes[code] = data
                else:
                    # Create placeholder if API fails
                    self.codes[code] = {'code': code, 'name': f'ICD-10-CM Code {code}'}
        
        # Build hierarchy tree - process codes in order from shortest to longest
        sorted_codes = sorted(codes, key=lambda x: (len(x.replace('.', '')), x))
        hierarchy = {}
        all_nodes = {}
        
        for code in sorted_codes:
            data = self.codes[code]
            level = self.get_code_level(code)
            parent_code = self.get_parent_code(code, available_codes)
            
            node = {
                'code': code,
                'name': data.get('name', ''),
                'level': level,
                'children': {}
            }
            all_nodes[code] = node
            
            if parent_code and parent_code in all_nodes:
                # Add as child of existing parent
                all_nodes[parent_code]['children'][code] = node
            elif parent_code and parent_code in self.codes:
                # Parent exists in codes but not yet processed - create it
                parent_data = self.codes[parent_code]
                parent_node = {
                    'code': parent_code,
                    'name': parent_data.get('name', ''),
                    'level': self.get_code_level(parent_code),
                    'children': {code: node}
                }
                all_nodes[parent_code] = parent_node
                # Check if this parent has a parent
                grandparent = self.get_parent_code(parent_code, available_codes)
                if grandparent and grandparent in all_nodes:
                    all_nodes[grandparent]['children'][parent_code] = parent_node
                elif not grandparent:
                    hierarchy[parent_code] = parent_node
            else:
                # Top level node (no parent or parent not in available codes)
                hierarchy[code] = node
        
        self.hierarchy = hierarchy
        return hierarchy
    
    def build_sample_hierarchy(self) -> Dict:
        """Build a sample hierarchy with common ICD-10-CM codes"""
        # Sample codes covering different chapters
        sample_codes = [
            # Chapter 1: A00-B99 (Certain infectious and parasitic diseases)
            'A00', 'A00.0', 'A00.1', 'A00.9',
            'A01', 'A01.0', 'A01.1', 'A01.2', 'A01.3', 'A01.4', 'A01.9',
            'B00', 'B00.0', 'B00.1', 'B00.2', 'B00.9',
            
            # Chapter 2: C00-D49 (Neoplasms)
            'C00', 'C00.0', 'C00.1', 'C00.2', 'C00.3', 'C00.4', 'C00.5', 'C00.6', 'C00.8', 'C00.9',
            'C50', 'C50.0', 'C50.1', 'C50.2', 'C50.3', 'C50.4', 'C50.5', 'C50.6', 'C50.8', 'C50.9',
            
            # Chapter 3: D50-D89 (Diseases of the blood and immune system)
            'D50', 'D50.0', 'D50.1', 'D50.8', 'D50.9',
            
            # Chapter 4: E00-E89 (Endocrine, nutritional and metabolic diseases)
            'E10', 'E10.1', 'E10.2', 'E10.9',
            'E11', 'E11.1', 'E11.2', 'E11.9',
            
            # Chapter 5: F01-F99 (Mental, Behavioral and Neurodevelopmental disorders)
            'F10', 'F10.1', 'F10.2', 'F10.9',
            'F32', 'F32.0', 'F32.1', 'F32.2', 'F32.3', 'F32.4', 'F32.5', 'F32.8', 'F32.9',
            
            # Chapter 9: I00-I99 (Diseases of the circulatory system)
            'I10', 'I11', 'I11.0', 'I11.9',
            'I20', 'I20.0', 'I20.1', 'I20.8', 'I20.9',
            'I21', 'I21.0', 'I21.1', 'I21.2', 'I21.3', 'I21.4', 'I21.9',
            
            # Chapter 10: J00-J99 (Diseases of the respiratory system)
            'J00', 'J01', 'J01.0', 'J01.1', 'J01.9',
            'J44', 'J44.0', 'J44.1', 'J44.9',
            
            # Chapter 13: M00-M99 (Diseases of the musculoskeletal system)
            'M25', 'M25.5', 'M25.50', 'M25.511', 'M25.512', 'M25.519',
            
            # Chapter 18: R00-R94 (Symptoms, signs and abnormal clinical findings)
            'R50', 'R50.9',
            'R51', 'R51.0', 'R51.9',
        ]
        
        return self.build_hierarchy_from_codes(sample_codes)
    
    def to_json(self, pretty: bool = True) -> str:
        """Convert hierarchy to JSON format"""
        def serialize_node(node):
            """Recursively serialize node and children"""
            result = {
                'code': node['code'],
                'name': node['name'],
                'level': node['level']
            }
            if node['children']:
                result['children'] = [serialize_node(child) for child in node['children'].values()]
            return result
        
        root_nodes = [serialize_node(node) for node in self.hierarchy.values()]
        
        if pretty:
            return json.dumps({'icd10cm': {'codes': root_nodes}}, indent=2, ensure_ascii=False)
        else:
            return json.dumps({'icd10cm': {'codes': root_nodes}}, ensure_ascii=False)
    
    def to_xml(self, pretty: bool = True) -> str:
        """Convert hierarchy to XML format"""
        root = ET.Element('icd10cm')
        
        def add_node(parent, node):
            """Recursively add node and children to XML"""
            code_elem = ET.SubElement(parent, 'code')
            code_elem.set('value', node['code'])
            code_elem.set('level', str(node['level']))
            
            name_elem = ET.SubElement(code_elem, 'name')
            name_elem.text = node['name']
            
            if node['children']:
                children_elem = ET.SubElement(code_elem, 'children')
                for child in node['children'].values():
                    add_node(children_elem, child)
        
        for node in self.hierarchy.values():
            add_node(root, node)
        
        if pretty:
            rough_string = ET.tostring(root, encoding='unicode')
            reparsed = minidom.parseString(rough_string)
            return reparsed.toprettyxml(indent="  ")
        else:
            return ET.tostring(root, encoding='unicode')


def main():
    parser = argparse.ArgumentParser(
        description='Generate ICD-10-CM code hierarchy in XML/JSON format'
    )
    parser.add_argument(
        '--format', '-f',
        choices=['json', 'xml', 'both'],
        default='both',
        help='Output format (default: both)'
    )
    parser.add_argument(
        '--output-dir', '-o',
        default='.',
        help='Output directory (default: current directory)'
    )
    parser.add_argument(
        '--sample',
        action='store_true',
        help='Use sample codes instead of fetching all codes'
    )
    parser.add_argument(
        '--codes-file',
        type=str,
        help='File containing list of ICD-10-CM codes (one per line)'
    )
    
    args = parser.parse_args()
    
    hierarchy_builder = ICD10CMHierarchy()
    
    if args.codes_file:
        # Read codes from file
        try:
            with open(args.codes_file, 'r') as f:
                codes = [line.strip() for line in f if line.strip()]
            print(f"Building hierarchy from {len(codes)} codes...", file=sys.stderr)
            hierarchy_builder.build_hierarchy_from_codes(codes)
        except FileNotFoundError:
            print(f"Error: File {args.codes_file} not found", file=sys.stderr)
            sys.exit(1)
    else:
        # Use sample codes
        print("Building sample hierarchy...", file=sys.stderr)
        hierarchy_builder.build_sample_hierarchy()
    
    # Generate outputs
    import os
    os.makedirs(args.output_dir, exist_ok=True)
    
    if args.format in ['json', 'both']:
        json_output = hierarchy_builder.to_json(pretty=True)
        json_path = os.path.join(args.output_dir, 'icd10cm_hierarchy.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            f.write(json_output)
        print(f"JSON hierarchy written to {json_path}", file=sys.stderr)
    
    if args.format in ['xml', 'both']:
        xml_output = hierarchy_builder.to_xml(pretty=True)
        xml_path = os.path.join(args.output_dir, 'icd10cm_hierarchy.xml')
        with open(xml_path, 'w', encoding='utf-8') as f:
            f.write(xml_output)
        print(f"XML hierarchy written to {xml_path}", file=sys.stderr)
    
    print("Done!", file=sys.stderr)


if __name__ == '__main__':
    main()

