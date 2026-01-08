import { Search, FileCode2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CodeSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCodes: number;
  filteredCount: number;
  selectedCount: number;
}

export function CodeSearchHeader({
  searchQuery,
  onSearchChange,
  totalCodes,
  filteredCount,
  selectedCount,
}: CodeSearchHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FileCode2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Medical Code Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Search across ICD-10-CM and HCPCS/CPT code lists
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by code, description, or category..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-14 pl-12 pr-4 text-base shadow-sm transition-shadow focus:shadow-md"
        />
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total codes:</span>
          <span className="font-medium text-foreground">{totalCodes.toLocaleString()}</span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Showing:</span>
          <span className="font-medium text-foreground">{filteredCount.toLocaleString()}</span>
        </div>
        {selectedCount > 0 && (
          <>
            <span className="text-border">•</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Selected:</span>
              <span className="font-medium text-primary">{selectedCount.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
