import { useMemo, useState, useCallback } from 'react';
import icd10Data from '@/data/icd10cm_hierarchy.json';
import hcpcsCodesData from '@/data/hcpcs_codes.json';
import ndcCodesData from '@/data/ndc_codes.json';
import { FlattenedCode, ICD10Code, CodeType, ImportedCSVRow } from '@/types/codes';

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

export interface ImportedCodeGroups {
  group1: string[];
  group2: string[];
  group3: string[];
}

/** Normalize CSV code_type (e.g. "ICD10", "ICD10CM", "ICD10DX") to our CodeType. */
function normalizeCodeTypeFromCSV(value: string): CodeType | null {
  const v = value.trim().toUpperCase();
  if (v === 'ICD10' || v === 'ICD10CM' || v === 'ICD10DX') return 'icd10cm';
  if (v === 'HCPCS') return 'hcpcs';
  if (v === 'NDC') return 'ndc';
  return null;
}

/**
 * Normalize ICD10 code for matching: add period after 3rd character if missing.
 * Data uses format like A00.0, A01.00. Uploaded codes may be A000, A0100.
 */
function normalizeICD10Code(value: string): string {
  const s = value.trim();
  if (s.includes('.')) return s; // already formatted
  // ICD10: 1 letter + 2 digits + [optional period] + up to 4 more chars
  if (s.length >= 4 && /^[A-Z]\d{2}/i.test(s)) {
    return s.slice(0, 3) + '.' + s.slice(3);
  }
  return s;
}

/** Normalize HCPCS for matching: remove all spaces (e.g. "H 0001" -> "H0001"). */
function normalizeHCPCSCode(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

/**
 * Convert NDC11 digits to NDC10 by removing the padded leading zero per FDA guide:
 * 4-4-2 (10) -> 5-4-2 (11): zero in first segment; 5-3-2 -> zero in second; 5-4-1 -> zero in third.
 * Input: 11-digit string. Output: 10-digit string.
 */
function ndc11ToNdc10Digits(digits11: string): string {
  if (digits11.length !== 11) return digits11;
  const s1 = digits11.slice(0, 5);
  const s2 = digits11.slice(5, 9);
  const s3 = digits11.slice(9, 11);
  if (s1[0] === '0') return s1.slice(1) + s2 + s3;       // was 4-4-2
  if (s2[0] === '0') return s1 + s2.slice(1) + s3;       // was 5-3-2
  if (s3[0] === '0') return s1 + s2 + s3.slice(1);       // was 5-4-1
  return digits11.slice(0, 10); // fallback: drop last digit
}

/** Resolve uploaded code_value to canonical code in our data. */
function resolveCodeForMatch(
  codeValue: string,
  rowType: CodeType,
  codesByType: Map<CodeType, Set<string>>,
  icd10UnformattedToCanonical: Map<string, string>,
  ndcDigitsToCanonical: Map<string, string>
): string | null {
  const s = codeValue.trim();
  if (!s) return null;
  const codes = codesByType.get(rowType);
  if (!codes) return null;

  if (rowType === 'icd10cm') {
    if (codes.has(s)) return s;
    const withPeriod = normalizeICD10Code(s);
    if (codes.has(withPeriod)) return withPeriod;
    const fromUnformatted = icd10UnformattedToCanonical.get(s.replace('.', ''));
    if (fromUnformatted) return fromUnformatted;
    return null;
  }

  if (rowType === 'hcpcs') {
    if (codes.has(s)) return s;
    const noSpaces = normalizeHCPCSCode(s);
    return codes.has(noSpaces) ? noSpaces : null;
  }

  if (rowType === 'ndc') {
    if (codes.has(s)) return s;
    const digitsOnly = s.replace(/\D/g, '');
    if (digitsOnly.length === 11) {
      const tenDigits = ndc11ToNdc10Digits(digitsOnly);
      const canonical = ndcDigitsToCanonical.get(tenDigits);
      if (canonical) return canonical;
    }
    if (digitsOnly.length === 10) {
      const canonical = ndcDigitsToCanonical.get(digitsOnly);
      if (canonical) return canonical;
    }
    return null;
  }

  return codes.has(s) ? s : null;
}

export function useCodeSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [codeTypeFilter, setCodeTypeFilter] = useState<CodeType | 'all'>('all');
  const [importedGroups, setImportedGroups] = useState<ImportedCodeGroups | null>(null);

  // Flatten all codes
  const allCodes = useMemo<FlattenedCode[]>(() => {
    const icd10Flattened = flattenICD10Codes(icd10Data.icd10cm.codes);
    const hcpcsFlattened: FlattenedCode[] = hcpcsCodesData.map(c => ({
      code: c.code,
      name: c.name,
      type: 'hcpcs' as CodeType,
      category: c.category,
    }));
    const ndcFlattened: FlattenedCode[] = ndcCodesData.map(c => ({
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

  // Helper to get all HCPCS codes in a category
  function getHCPCSCodesInCategory(category: string): string[] {
    return hcpcsCodesData
      .filter(c => c.category === category)
      .map(c => c.code);
  }

  // Selection handlers - when toggling a parent ICD-10 code or HCPCS category, also toggle all children
  const toggleCode = useCallback((code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      
      // Check if this is an HCPCS category (category names are used as parent codes in the tree)
      const hcpcsCategoryCodes = getHCPCSCodesInCategory(code);
      
      // Get all descendant codes for ICD-10 hierarchical selection
      const icd10Descendants = getAllDescendantCodes(icd10Data.icd10cm.codes as ICD10Code[], code);
      
      // Determine which type of hierarchical selection this is
      if (hcpcsCategoryCodes.length > 0) {
        // This is an HCPCS category - toggle all codes in the category
        const isCurrentlySelected = hcpcsCategoryCodes.every(c => next.has(c));
        
        if (isCurrentlySelected) {
          // Deselect all codes in category
          for (const c of hcpcsCategoryCodes) {
            next.delete(c);
          }
        } else {
          // Select all codes in category
          for (const c of hcpcsCategoryCodes) {
            next.add(c);
          }
        }
      } else if (icd10Descendants.length > 0) {
        // This is an ICD-10 parent code - toggle all descendants
        const isCurrentlySelected = next.has(code);
        
        if (isCurrentlySelected) {
          // Deselect all
          for (const c of icd10Descendants) {
            next.delete(c);
          }
        } else {
          // Select all
          for (const c of icd10Descendants) {
            next.add(c);
          }
        }
      } else {
        // Leaf node or non-hierarchical code - just toggle the single code
        if (next.has(code)) {
          next.delete(code);
        } else {
          next.add(code);
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

  const removeCode = useCallback((code: string) => {
    setSelectedCodes(prev => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }, []);

  const isAllSelected = useMemo(() => {
    if (filteredCodes.length === 0) return false;
    return filteredCodes.every(c => selectedCodes.has(c.code));
  }, [filteredCodes, selectedCodes]);

  const isSomeSelected = useMemo(() => {
    return filteredCodes.some(c => selectedCodes.has(c.code)) && !isAllSelected;
  }, [filteredCodes, selectedCodes, isAllSelected]);

  // Import codes from CSV with group assignments
  // CSV columns: code_group, code_category (optional), code_type, code_value, code_desc (optional)
  // Matches only within the row's code_type; handles ICD10 with or without period.
  const importCodesFromCSV = useCallback((codes: ImportedCSVRow[]) => {
    const codeSet = new Set<string>();
    const groups: ImportedCodeGroups = { group1: [], group2: [], group3: [] };

    // Build lookups by code type (only search within that category)
    const codesByType = new Map<CodeType, Set<string>>();
    for (const c of allCodes) {
      if (!codesByType.has(c.type)) codesByType.set(c.type, new Set());
      codesByType.get(c.type)!.add(c.code);
    }

    // ICD10: map unformatted (no period) -> canonical (with period) for flexible matching
    const icd10UnformattedToCanonical = new Map<string, string>();
    const icd10Codes = codesByType.get('icd10cm');
    if (icd10Codes) {
      icd10Codes.forEach(canonical => {
        const unformatted = canonical.replace('.', '');
        if (unformatted !== canonical) icd10UnformattedToCanonical.set(unformatted, canonical);
      });
    }

    // NDC: map 10-digit string (no dashes) -> canonical (with dashes) for flexible matching
    const ndcDigitsToCanonical = new Map<string, string>();
    const ndcCodes = codesByType.get('ndc');
    if (ndcCodes) {
      ndcCodes.forEach(canonical => {
        const digitsOnly = canonical.replace(/\D/g, '');
        if (digitsOnly.length === 10) ndcDigitsToCanonical.set(digitsOnly, canonical);
      });
    }

    const matchedCodes: string[] = [];
    const unmatchedCodes: string[] = [];
    const codeTypesSeen = new Set<CodeType>();

    for (const row of codes) {
      const codeStr = row.code_value.trim();
      if (!codeStr) continue;

      const rowType = normalizeCodeTypeFromCSV(row.code_type);
      if (rowType === null) {
        unmatchedCodes.push(codeStr);
        continue;
      }
      codeTypesSeen.add(rowType);

      const canonicalCode = resolveCodeForMatch(
        codeStr,
        rowType,
        codesByType,
        icd10UnformattedToCanonical,
        ndcDigitsToCanonical
      );

      if (canonicalCode !== null) {
        codeSet.add(canonicalCode);
        matchedCodes.push(canonicalCode);

        const groupValue = row.code_group.trim();
        if (groupValue === '2') {
          groups.group2.push(canonicalCode);
        } else if (groupValue === '3') {
          groups.group3.push(canonicalCode);
        } else {
          groups.group1.push(canonicalCode);
        }
      } else {
        unmatchedCodes.push(codeStr);
      }
    }

    setSelectedCodes(codeSet);
    setImportedGroups(groups);

    // When upload has a single code_type, filter the list to that category
    if (codeTypesSeen.size === 1) {
      setCodeTypeFilter([...codeTypesSeen][0]);
    } else {
      setCodeTypeFilter('all');
    }

    return { matchedCodes, unmatchedCodes };
  }, [allCodes]);

  const clearImportedGroups = useCallback(() => {
    setImportedGroups(null);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    selectedCodes,
    toggleCode,
    removeCode,
    selectAll,
    deselectAll,
    isAllSelected,
    isSomeSelected,
    codeTypeFilter,
    setCodeTypeFilter,
    filteredCodes,
    searchFilteredCounts,
    totalCodes: allCodes.length,
    allCodes,
    importCodesFromCSV,
    importedGroups,
    clearImportedGroups,
  };
}
