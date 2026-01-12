import { useMemo, useState, useCallback } from 'react';
import icd10Data from '@/data/icd10cm_hierarchy.json';
import { hcpcsCodes } from '@/data/hcpcs_codes';
import { ndcCodes } from '@/data/ndc_codes';
import { FlattenedCode, ICD10Code, CodeType } from '@/types/codes';

// Helper to get all descendant codes from a node
function getAllDescendantCodes(codes: ICD10Code[], targetCode: string): string[] {
  for (const code of codes) {
    if (code.code === targetCode) {
      // Found the target, collect all descendants
      return collectAllCodes(code);
    }
    if (code.children) {
      const found = getAllDescendantCodes(code.children, targetCode);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function collectAllCodes(node: ICD10Code): string[] {
  const codes = [node.code];
  if (node.children) {
    for (const child of node.children) {
      codes.push(...collectAllCodes(child));
    }
  }
  return codes;
}

function flattenICD10Codes(codes: ICD10Code[], parentCode?: string): FlattenedCode[] {
  const result: FlattenedCode[] = [];
  
  for (const code of codes) {
    result.push({
      code: code.code,
      name: code.name,
      type: 'icd10cm',
      level: code.level,
      parentCode,
    });
    
    if (code.children) {
      result.push(...flattenICD10Codes(code.children, code.code));
    }
  }
  
  return result;
}

export function useCodeSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [codeTypeFilter, setCodeTypeFilter] = useState<CodeType | 'all'>('all');

  // Flatten all codes
  const allCodes = useMemo<FlattenedCode[]>(() => {
    const icd10Flattened = flattenICD10Codes(icd10Data.icd10cm.codes);
    const hcpcsFlattened: FlattenedCode[] = hcpcsCodes.map(c => ({
      code: c.code,
      name: c.name,
      type: 'hcpcs' as CodeType,
      category: c.category,
    }));
    const ndcFlattened: FlattenedCode[] = ndcCodes.map(c => ({
      code: c.code,
      name: c.name,
      type: 'ndc' as CodeType,
      manufacturer: c.manufacturer,
      packageSize: c.packageSize,
    }));
    
    return [...icd10Flattened, ...hcpcsFlattened, ...ndcFlattened];
  }, []);

  // Filter codes by search query only (for counts that don't change with type filter)
  const searchFilteredCodes = useMemo(() => {
    if (!searchQuery.trim()) return allCodes;
    
    const query = searchQuery.toLowerCase().trim();
    const queryTerms = query.split(/\s+/);
    
    return allCodes.filter(code => {
      const searchableText = `${code.code} ${code.name} ${code.category || ''}`.toLowerCase();
      return queryTerms.every(term => searchableText.includes(term));
    });
  }, [allCodes, searchQuery]);

  // Counts by type (based on search only, not type filter)
  const searchFilteredCounts = useMemo(() => ({
    all: searchFilteredCodes.length,
    icd10cm: searchFilteredCodes.filter(c => c.type === 'icd10cm').length,
    hcpcs: searchFilteredCodes.filter(c => c.type === 'hcpcs').length,
    ndc: searchFilteredCodes.filter(c => c.type === 'ndc').length,
  }), [searchFilteredCodes]);

  // Filter codes based on search query and type filter
  const filteredCodes = useMemo(() => {
    let codes = searchFilteredCodes;
    
    // Apply type filter
    if (codeTypeFilter !== 'all') {
      codes = codes.filter(c => c.type === codeTypeFilter);
    }
    
    return codes;
  }, [searchFilteredCodes, codeTypeFilter]);

  // Selection handlers - when toggling a parent ICD-10 code, also toggle all children
  const toggleCode = useCallback((code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      
      // Get all descendant codes for ICD-10 hierarchical selection
      const allCodesToToggle = getAllDescendantCodes(icd10Data.icd10cm.codes as ICD10Code[], code);
      
      // If no descendants found (non-ICD10 or leaf node), just toggle the single code
      if (allCodesToToggle.length === 0) {
        if (next.has(code)) {
          next.delete(code);
        } else {
          next.add(code);
        }
      } else {
        // Check if the parent is currently selected
        const isCurrentlySelected = next.has(code);
        
        if (isCurrentlySelected) {
          // Deselect all
          for (const c of allCodesToToggle) {
            next.delete(c);
          }
        } else {
          // Select all
          for (const c of allCodesToToggle) {
            next.add(c);
          }
        }
      }
      
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allFilteredCodes = filteredCodes.map(c => c.code);
    setSelectedCodes(new Set(allFilteredCodes));
  }, [filteredCodes]);

  const deselectAll = useCallback(() => {
    setSelectedCodes(new Set());
  }, []);

  const isAllSelected = useMemo(() => {
    if (filteredCodes.length === 0) return false;
    return filteredCodes.every(c => selectedCodes.has(c.code));
  }, [filteredCodes, selectedCodes]);

  const isSomeSelected = useMemo(() => {
    return filteredCodes.some(c => selectedCodes.has(c.code)) && !isAllSelected;
  }, [filteredCodes, selectedCodes, isAllSelected]);

  return {
    searchQuery,
    setSearchQuery,
    selectedCodes,
    toggleCode,
    selectAll,
    deselectAll,
    isAllSelected,
    isSomeSelected,
    codeTypeFilter,
    setCodeTypeFilter,
    filteredCodes,
    searchFilteredCounts,
    totalCodes: allCodes.length,
  };
}
