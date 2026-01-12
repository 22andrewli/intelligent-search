import { CheckSquare, Square, MinusSquare, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FlattenedCode } from '@/types/codes';

interface SelectionToolbarProps {
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selectedCodes: Set<string>;
  filteredCodes: FlattenedCode[];
}

export function SelectionToolbar({
  isAllSelected,
  isSomeSelected,
  onSelectAll,
  onDeselectAll,
  selectedCodes,
  filteredCodes,
}: SelectionToolbarProps) {
  const handleToggleAll = () => {
    if (isAllSelected || isSomeSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handleCopySelected = () => {
    const selectedItems = filteredCodes.filter(c => selectedCodes.has(c.code));
    const text = selectedItems.map(c => `${c.code}: ${c.name}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${selectedItems.length} codes to clipboard`);
  };

  const handleExportSelected = () => {
    const selectedItems = filteredCodes.filter(c => selectedCodes.has(c.code));
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

  const SelectIcon = isAllSelected 
    ? CheckSquare 
    : isSomeSelected 
      ? MinusSquare 
      : Square;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {selectedCodes.size > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySelected}
            className="h-9 gap-2 text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportSelected}
            className="h-9 gap-2 text-muted-foreground hover:text-foreground"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

          <div className="h-6 w-px bg-border" />
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleAll}
        className="h-9 w-[120px] gap-2"
      >
        <SelectIcon className="h-4 w-4" />
        {isAllSelected ? 'Deselect All' : isSomeSelected ? 'Deselect All' : 'Select All'}
      </Button>
    </div>
  );
}
