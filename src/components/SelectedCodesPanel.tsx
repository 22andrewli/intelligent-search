import { useMemo } from 'react';
import { X, CheckSquare, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlattenedCode } from '@/types/codes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SelectedCodesPanelProps {
  selectedCodes: Set<string>;
  allCodes: FlattenedCode[];
  onRemove: (code: string) => void;
  onClearAll: () => void;
}

function getTypeBadgeClass(type: string) {
  switch (type) {
    case 'icd10cm':
      return 'bg-code-badge-icd text-code-icd';
    case 'hcpcs':
      return 'bg-code-badge-cpt text-code-cpt';
    case 'ndc':
      return 'bg-code-badge-ndc text-code-ndc';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'icd10cm':
      return 'ICD-10';
    case 'hcpcs':
      return 'HCPCS';
    case 'ndc':
      return 'NDC';
    default:
      return type;
  }
}

export function SelectedCodesPanel({
  selectedCodes,
  allCodes,
  onRemove,
  onClearAll,
}: SelectedCodesPanelProps) {
  const selectedItems = useMemo(() => {
    const codeMap = new Map<string, FlattenedCode>();
    allCodes.forEach(code => {
      codeMap.set(code.code, code);
    });
    
    return Array.from(selectedCodes)
      .map(code => codeMap.get(code))
      .filter((code): code is FlattenedCode => code !== undefined)
      .sort((a, b) => {
        // Sort by type first, then by code
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.code.localeCompare(b.code);
      });
  }, [selectedCodes, allCodes]);

  // Group by type - must be called before early return to maintain hook order
  const groupedByType = useMemo(() => {
    const groups: Record<string, FlattenedCode[]> = {
      icd10cm: [],
      hcpcs: [],
      ndc: [],
    };
    
    selectedItems.forEach(item => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    });
    
    return groups;
  }, [selectedItems]);

  if (selectedCodes.size === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Selected Codes</h2>
            </div>
            <span className="text-sm text-muted-foreground">0</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              No codes selected
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Select codes from the list to see them here
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const handleExportCSV = () => {
    const csv = [
      'Code,Description,Type,Category',
      ...selectedItems.map(c => 
        `"${c.code}","${c.name}","${c.type}","${c.category || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_codes.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedItems.length} codes`);
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Selected Codes</h2>
          </div>
          <span className="text-sm font-medium text-foreground">
            {selectedCodes.size}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(groupedByType).map(([type, codes]) => {
            if (codes.length === 0) return null;
            
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    getTypeBadgeClass(type)
                  )}>
                    {getTypeLabel(type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({codes.length})
                  </span>
                </div>
                
                <div className="space-y-1">
                  {codes.map((code) => (
                    <div
                      key={code.code}
                      className="group flex items-start gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'shrink-0 rounded-md px-2 py-0.5 text-xs font-mono font-semibold',
                            getTypeBadgeClass(type)
                          )}>
                            {code.code}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {code.name}
                        </p>
                        {(code.category || code.manufacturer || code.level) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {code.category || code.manufacturer || (code.level && `Level ${code.level}`)}
                            {code.packageSize && ` • ${code.packageSize}`}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(code.code)}
                        className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
