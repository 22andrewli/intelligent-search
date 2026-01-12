import { useMemo, useState } from 'react';
import { FlattenedCode, CodeType } from '@/types/codes';
import { CodeResultItem } from './CodeResultItem';
import { ICD10TreeView } from './ICD10TreeView';
import { HCPCSTreeView } from './HCPCSTreeView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileSearch, ChevronDown, ChevronRight } from 'lucide-react';

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
  // Collapsible state for each section - must be declared before any returns
  const [icdOpen, setIcdOpen] = useState(true);
  const [hcpcsOpen, setHcpcsOpen] = useState(true);
  const [ndcOpen, setNdcOpen] = useState(true);

  // For ICD-10 and HCPCS only views, show hierarchical tree
  const showICDHierarchy = codeTypeFilter === 'icd10cm';
  const showHCPCSHierarchy = codeTypeFilter === 'hcpcs';
  
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
  if (showICDHierarchy) {
    return (
      <ICD10TreeView
        selectedCodes={selectedCodes}
        onToggle={onToggle}
        searchQuery={searchQuery}
      />
    );
  }

  // HCPCS only view - show hierarchical tree
  if (showHCPCSHierarchy) {
    return (
      <HCPCSTreeView
        selectedCodes={selectedCodes}
        onToggle={onToggle}
        searchQuery={searchQuery}
      />
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
        <Collapsible open={icdOpen} onOpenChange={setIcdOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted transition-colors">
            {icdOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="text-sm font-semibold text-foreground">ICD-10-CM Codes</h3>
            <span className="rounded-full bg-code-badge-icd px-2 py-0.5 text-xs font-medium text-code-icd">
              Hierarchical
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <ICD10TreeView
              selectedCodes={selectedCodes}
              onToggle={onToggle}
              searchQuery={searchQuery}
              embedded
            />
          </CollapsibleContent>
        </Collapsible>
        
        {/* HCPCS Section */}
        {hcpcsCodes.length > 0 && (
          <Collapsible open={hcpcsOpen} onOpenChange={setHcpcsOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted transition-colors">
              {hcpcsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="text-sm font-semibold text-foreground">HCPCS/CPT Codes</h3>
              <span className="rounded-full bg-code-badge-cpt px-2 py-0.5 text-xs font-medium text-code-cpt">
                Hierarchical
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <HCPCSTreeView
                selectedCodes={selectedCodes}
                onToggle={onToggle}
                searchQuery={searchQuery}
                embedded
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* NDC Section */}
        {ndcCodes.length > 0 && (
          <Collapsible open={ndcOpen} onOpenChange={setNdcOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted transition-colors">
              {ndcOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <h3 className="text-sm font-semibold text-foreground">NDC Codes</h3>
              <span className="rounded-full bg-code-badge-ndc px-2 py-0.5 text-xs font-medium text-code-ndc">
                {ndcCodes.length} codes
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
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
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </ScrollArea>
  );
}
