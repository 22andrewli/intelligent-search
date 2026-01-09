import { useMemo } from 'react';
import { CodeTreeItem } from './CodeTreeItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSearch } from 'lucide-react';
import icd10Data from '@/data/icd10cm_hierarchy.json';

interface ICD10Code {
  code: string;
  name: string;
  level: number;
  children?: ICD10Code[];
}

interface ICD10TreeViewProps {
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  searchQuery: string;
  embedded?: boolean; // When true, doesn't wrap in ScrollArea (for use inside another ScrollArea)
}

function filterTree(nodes: ICD10Code[], query: string): ICD10Code[] {
  if (!query.trim()) return nodes;
  
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  
  function nodeMatches(node: ICD10Code): boolean {
    const searchableText = `${node.code} ${node.name}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
  }
  
  function filterNode(node: ICD10Code): ICD10Code | null {
    const selfMatches = nodeMatches(node);
    
    let filteredChildren: ICD10Code[] | undefined;
    if (node.children) {
      filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is ICD10Code => child !== null);
    }
    
    // Include node if it matches OR has matching children
    if (selfMatches || (filteredChildren && filteredChildren.length > 0)) {
      return {
        ...node,
        children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined,
      };
    }
    
    return null;
  }
  
  return nodes
    .map(node => filterNode(node))
    .filter((node): node is ICD10Code => node !== null);
}

export function ICD10TreeView({
  selectedCodes,
  onToggle,
  searchQuery,
  embedded = false,
}: ICD10TreeViewProps) {
  const filteredCodes = useMemo(() => {
    return filterTree(icd10Data.icd10cm.codes as ICD10Code[], searchQuery);
  }, [searchQuery]);

  if (filteredCodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No ICD-10-CM codes found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search terms
        </p>
      </div>
    );
  }

  const treeContent = (
    <div className="space-y-2 pr-4">
      {filteredCodes.map((code) => (
        <CodeTreeItem
          key={code.code}
          node={code}
          isSelected={selectedCodes.has(code.code)}
          onToggleSelect={onToggle}
          selectedCodes={selectedCodes}
          searchQuery={searchQuery}
          defaultExpanded={!!searchQuery.trim()}
        />
      ))}
    </div>
  );

  // When embedded in another ScrollArea, don't add another wrapper
  if (embedded) {
    return treeContent;
  }

  return (
    <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px] scrollbar-thin">
      {treeContent}
    </ScrollArea>
  );
}
