import { useMemo } from 'react';
import { FlattenedCode, CodeType } from '@/types/codes';
import { CodeResultItem } from './CodeResultItem';
import { ICD10TreeView } from './ICD10TreeView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSearch } from 'lucide-react';

interface CodeResultsListProps {
  codes: FlattenedCode[];
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  searchQuery: string;
  codeTypeFilter: CodeType | 'all';
}

export function CodeResultsList({
  codes,
  selectedCodes,
  onToggle,
  searchQuery,
  codeTypeFilter,
}: CodeResultsListProps) {
  // For ICD-10 only view, show hierarchical tree
  const showHierarchy = codeTypeFilter === 'icd10cm';
  
  // Filter codes by type for flat views
  const hcpcsCodes = useMemo(() => codes.filter(c => c.type === 'hcpcs'), [codes]);
  const ndcCodes = useMemo(() => codes.filter(c => c.type === 'ndc'), [codes]);
  
  // Limit visible codes for performance
  const visibleHcpcsCodes = useMemo(() => hcpcsCodes.slice(0, 100), [hcpcsCodes]);
  const visibleNdcCodes = useMemo(() => ndcCodes.slice(0, 100), [ndcCodes]);
  const hasMoreHcpcs = hcpcsCodes.length > 100;
  const hasMoreNdc = ndcCodes.length > 100;

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No codes found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  // ICD-10-CM only view - show hierarchical tree
  if (showHierarchy) {
    return (
      <ICD10TreeView
        selectedCodes={selectedCodes}
        onToggle={onToggle}
        searchQuery={searchQuery}
      />
    );
  }

  // HCPCS only view - show flat list
  if (codeTypeFilter === 'hcpcs') {
    return (
      <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px] scrollbar-thin">
        <div className="space-y-2 pr-4">
          {visibleHcpcsCodes.map((code) => (
            <CodeResultItem
              key={`${code.type}-${code.code}`}
              code={code}
              isSelected={selectedCodes.has(code.code)}
              onToggle={() => onToggle(code.code)}
              searchQuery={searchQuery}
            />
          ))}
          
          {hasMoreHcpcs && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Showing {visibleHcpcsCodes.length} of {hcpcsCodes.length.toLocaleString()} results.
                <br />
                <span className="text-xs">Refine your search to see more specific results.</span>
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  // NDC only view - show flat list
  if (codeTypeFilter === 'ndc') {
    return (
      <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px] scrollbar-thin">
        <div className="space-y-2 pr-4">
          {visibleNdcCodes.map((code) => (
            <CodeResultItem
              key={`${code.type}-${code.code}`}
              code={code}
              isSelected={selectedCodes.has(code.code)}
              onToggle={() => onToggle(code.code)}
              searchQuery={searchQuery}
            />
          ))}
          
          {hasMoreNdc && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Showing {visibleNdcCodes.length} of {ndcCodes.length.toLocaleString()} results.
                <br />
                <span className="text-xs">Refine your search to see more specific results.</span>
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  // All codes view - show all sections
  return (
    <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px] scrollbar-thin">
      <div className="space-y-3 pr-4">
        {/* ICD-10-CM Section */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">ICD-10-CM Codes</h3>
            <span className="rounded-full bg-code-badge-icd px-2 py-0.5 text-xs font-medium text-code-icd">
              Hierarchical
            </span>
          </div>
          <ICD10TreeView
            selectedCodes={selectedCodes}
            onToggle={onToggle}
            searchQuery={searchQuery}
            embedded
          />
        </div>
        
        {/* HCPCS Section */}
        {hcpcsCodes.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">HCPCS/CPT Codes</h3>
              <span className="rounded-full bg-code-badge-cpt px-2 py-0.5 text-xs font-medium text-code-cpt">
                {hcpcsCodes.length} codes
              </span>
            </div>
            <div className="space-y-2">
              {visibleHcpcsCodes.map((code) => (
                <CodeResultItem
                  key={`${code.type}-${code.code}`}
                  code={code}
                  isSelected={selectedCodes.has(code.code)}
                  onToggle={() => onToggle(code.code)}
                  searchQuery={searchQuery}
                />
              ))}
              
              {hasMoreHcpcs && (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {visibleHcpcsCodes.length} of {hcpcsCodes.length.toLocaleString()} results.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NDC Section */}
        {ndcCodes.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">NDC Codes</h3>
              <span className="rounded-full bg-code-badge-ndc px-2 py-0.5 text-xs font-medium text-code-ndc">
                {ndcCodes.length} codes
              </span>
            </div>
            <div className="space-y-2">
              {visibleNdcCodes.map((code) => (
                <CodeResultItem
                  key={`${code.type}-${code.code}`}
                  code={code}
                  isSelected={selectedCodes.has(code.code)}
                  onToggle={() => onToggle(code.code)}
                  searchQuery={searchQuery}
                />
              ))}
              
              {hasMoreNdc && (
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing {visibleNdcCodes.length} of {ndcCodes.length.toLocaleString()} results.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
