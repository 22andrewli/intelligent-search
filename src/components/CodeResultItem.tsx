import { memo } from 'react';
import { Check } from 'lucide-react';
import { FlattenedCode } from '@/types/codes';
import { cn } from '@/lib/utils';

interface CodeResultItemProps {
  code: FlattenedCode;
  isSelected: boolean;
  onToggle: () => void;
  searchQuery: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  
  // Create a regex pattern from all terms
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    const isMatch = terms.some(term => part.toLowerCase() === term);
    if (isMatch) {
      return (
        <mark key={i} className="bg-selection-bg text-selection rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

export const CodeResultItem = memo(function CodeResultItem({
  code,
  isSelected,
  onToggle,
  searchQuery,
}: CodeResultItemProps) {
  const isICD = code.type === 'icd10cm';
  
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-all',
        'hover:border-primary/30 hover:bg-muted/50',
        isSelected && 'border-primary/50 bg-selection-bg'
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/30 group-hover:border-primary/50'
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-3">
          {/* Code Badge */}
          <span
            className={cn(
              'shrink-0 rounded-md px-2.5 py-1 text-sm font-mono font-semibold',
              isICD
                ? 'bg-code-badge-icd text-code-icd'
                : 'bg-code-badge-cpt text-code-cpt'
            )}
          >
            {highlightMatch(code.code, searchQuery)}
          </span>
          
          {/* Type Tag */}
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
              isICD
                ? 'bg-code-badge-icd text-code-icd'
                : 'bg-code-badge-cpt text-code-cpt'
            )}
          >
            {isICD ? 'ICD-10' : 'HCPCS'}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground">
          {highlightMatch(code.name, searchQuery)}
        </p>

        {/* Category / Level indicator */}
        {(code.category || code.level) && (
          <p className="text-xs text-muted-foreground">
            {code.category || (code.level && `Level ${code.level}`)}
            {code.parentCode && ` • Parent: ${code.parentCode}`}
          </p>
        )}
      </div>
    </button>
  );
});
