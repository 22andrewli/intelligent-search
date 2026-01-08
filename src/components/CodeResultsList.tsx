import { useMemo } from 'react';
import { FlattenedCode } from '@/types/codes';
import { CodeResultItem } from './CodeResultItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSearch } from 'lucide-react';

interface CodeResultsListProps {
  codes: FlattenedCode[];
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  searchQuery: string;
}

export function CodeResultsList({
  codes,
  selectedCodes,
  onToggle,
  searchQuery,
}: CodeResultsListProps) {
  // Limit visible codes for performance
  const visibleCodes = useMemo(() => codes.slice(0, 100), [codes]);
  const hasMore = codes.length > 100;

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

  return (
    <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px] scrollbar-thin">
      <div className="space-y-2 pr-4">
        {visibleCodes.map((code) => (
          <CodeResultItem
            key={`${code.type}-${code.code}`}
            code={code}
            isSelected={selectedCodes.has(code.code)}
            onToggle={() => onToggle(code.code)}
            searchQuery={searchQuery}
          />
        ))}
        
        {hasMore && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Showing {visibleCodes.length} of {codes.length.toLocaleString()} results.
              <br />
              <span className="text-xs">Refine your search to see more specific results.</span>
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
