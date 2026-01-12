import { memo, useState } from 'react';
import { Check, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeTreeNode {
  code: string;
  name: string;
  level: number;
  children?: CodeTreeNode[];
}

interface CodeTreeItemProps {
  node: CodeTreeNode;
  isSelected: boolean;
  onToggleSelect: (code: string) => void;
  selectedCodes: Set<string>;
  searchQuery: string;
  defaultExpanded?: boolean;
  codeType?: 'icd10cm' | 'hcpcs'; // Optional type hint for styling
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  
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

export const CodeTreeItem = memo(function CodeTreeItem({
  node,
  isSelected,
  onToggleSelect,
  selectedCodes,
  searchQuery,
  defaultExpanded = false,
  codeType,
}: CodeTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children && node.children.length > 0;
  
  // Detect code type if not provided
  const detectedType = codeType || (() => {
    // HCPCS codes typically start with A-V or are numeric 5-digit codes
    // ICD-10 codes have format like A00.0, B01.1, etc.
    const code = node.code;
    if (/^[A-V]\d{4}/.test(code) || /^\d{5}/.test(code)) {
      return 'hcpcs';
    }
    if (/^[A-Z]\d{2}/.test(code) || code.includes('.')) {
      return 'icd10cm';
    }
    // If it's a long text (category name), it's likely HCPCS category
    if (code.length > 10 && !code.includes('.')) {
      return 'hcpcs';
    }
    return 'icd10cm'; // Default
  })();
  
  // Calculate indentation based on level
  const indentLevel = node.level - 1;
  
  // Get badge styling based on type
  const badgeClass = detectedType === 'hcpcs' 
    ? 'bg-code-badge-cpt text-code-cpt'
    : 'bg-code-badge-icd text-code-icd';
  
  // Check if any children are selected
  const hasSelectedChildren = hasChildren && node.children!.some(child => {
    if (selectedCodes.has(child.code)) return true;
    if (child.children) {
      return child.children.some(grandChild => selectedCodes.has(grandChild.code));
    }
    return false;
  });

  return (
    <div className="w-full">
      <div
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg border p-3 transition-all',
          'hover:border-primary/30 hover:bg-muted/50',
          isSelected && 'border-primary/50 bg-selection-bg',
          node.level === 1 && 'bg-card shadow-sm',
          node.level > 1 && 'border-transparent'
        )}
        style={{ marginLeft: `${indentLevel * 20}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(node.code)}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
            isSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : hasSelectedChildren
                ? 'border-primary/50 bg-primary/20'
                : 'border-muted-foreground/30 group-hover:border-primary/50'
          )}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div 
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => onToggleSelect(node.code)}
        >
          <div className="flex items-center gap-2">
            {/* Code Badge */}
            <span
              className={cn(
                'shrink-0 rounded-md px-2 py-0.5 text-sm font-mono font-semibold',
                badgeClass,
                node.level === 1 && 'text-base'
              )}
            >
              {highlightMatch(node.code, searchQuery)}
            </span>
            
            {/* Level indicator */}
            {node.level === 1 && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Category
              </span>
            )}
            
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                ({node.children!.length} subcodes)
              </span>
            )}
          </div>

          {/* Description */}
          <p className={cn(
            'mt-1 text-sm text-foreground',
            node.level > 2 && 'text-muted-foreground'
          )}>
            {highlightMatch(node.name, searchQuery)}
          </p>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 border-l-2 border-muted ml-3">
          {node.children!.map((child) => (
            <CodeTreeItem
              key={child.code}
              node={child}
              isSelected={selectedCodes.has(child.code)}
              onToggleSelect={onToggleSelect}
              selectedCodes={selectedCodes}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
});
