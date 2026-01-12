import { useMemo } from 'react';
import { CodeTreeItem } from './CodeTreeItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSearch } from 'lucide-react';
import { hcpcsCodes } from '@/data/hcpcs_codes';

interface HCPCSCodeNode {
  code: string;
  name: string;
  level: number;
  children?: HCPCSCodeNode[];
}

interface HCPCSTreeViewProps {
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  searchQuery: string;
  embedded?: boolean; // When true, doesn't wrap in ScrollArea (for use inside another ScrollArea)
}

// Build hierarchy from flat HCPCS codes
function buildHCPCSHierarchy(codes: typeof hcpcsCodes): HCPCSCodeNode[] {
  // Group codes by category
  const categoryMap = new Map<string, HCPCSCodeNode[]>();
  
  for (const code of codes) {
    const category = code.category;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push({
      code: code.code,
      name: code.name,
      level: 2, // Child level
    });
  }
  
  // Build hierarchy with categories as parents
  const hierarchy: HCPCSCodeNode[] = [];
  
  // Sort categories alphabetically
  const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );
  
  for (const [category, children] of sortedCategories) {
    // Sort children by code
    const sortedChildren = children.sort((a, b) => a.code.localeCompare(b.code));
    
    hierarchy.push({
      code: category, // Use category as the code for parent nodes
      name: category,
      level: 1, // Parent level
      children: sortedChildren,
    });
  }
  
  return hierarchy;
}

function filterTree(nodes: HCPCSCodeNode[], query: string): HCPCSCodeNode[] {
  if (!query.trim()) return nodes;
  
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  
  function nodeMatches(node: HCPCSCodeNode): boolean {
    const searchableText = `${node.code} ${node.name}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
  }
  
  function filterNode(node: HCPCSCodeNode): HCPCSCodeNode | null {
    const selfMatches = nodeMatches(node);
    
    let filteredChildren: HCPCSCodeNode[] | undefined;
    if (node.children) {
      filteredChildren = node.children
        .map(child => filterNode(child))
        .filter((child): child is HCPCSCodeNode => child !== null);
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
    .filter((node): node is HCPCSCodeNode => node !== null);
}

export function HCPCSTreeView({
  selectedCodes,
  onToggle,
  searchQuery,
  embedded = false,
}: HCPCSTreeViewProps) {
  const hierarchy = useMemo(() => buildHCPCSHierarchy(hcpcsCodes), []);
  
  const filteredCodes = useMemo(() => {
    return filterTree(hierarchy, searchQuery);
  }, [hierarchy, searchQuery]);

  if (filteredCodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No HCPCS codes found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search terms
        </p>
      </div>
    );
  }

  const treeContent = (
    <div className="space-y-2 pr-4">
      {filteredCodes.map((category) => {
        // For categories, check if all children are selected
        const categoryCodes = category.children?.map(c => c.code) || [];
        const allChildrenSelected = categoryCodes.length > 0 && categoryCodes.every(code => selectedCodes.has(code));
        
        return (
          <CodeTreeItem
            key={category.code}
            node={category}
            isSelected={allChildrenSelected}
            onToggleSelect={onToggle}
            selectedCodes={selectedCodes}
            searchQuery={searchQuery}
            defaultExpanded={!!searchQuery.trim()}
            codeType="hcpcs"
          />
        );
      })}
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
