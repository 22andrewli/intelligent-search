import { useMemo, useState, useCallback } from 'react';
import icd10Data from '@/data/icd10cm_hierarchy.json';
import { hcpcsCodes } from '@/data/hcpcs_codes';
import { ndcCodes } from '@/data/ndc_codes';
import { FlattenedCode, ICD10Code, CodeType } from '@/types/codes';

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

  // Filter codes based on search query and type filter
  const filteredCodes = useMemo(() => {
    let codes = allCodes;
    
    // Apply type filter
    if (codeTypeFilter !== 'all') {
      codes = codes.filter(c => c.type === codeTypeFilter);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const queryTerms = query.split(/\s+/);
      
      codes = codes.filter(code => {
        const searchableText = `${code.code} ${code.name} ${code.category || ''}`.toLowerCase();
        return queryTerms.every(term => searchableText.includes(term));
      });
    }
    
    return codes;
  }, [allCodes, searchQuery, codeTypeFilter]);

  // Selection handlers
  const toggleCode = useCallback((code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
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
    totalCodes: allCodes.length,
  };
}
