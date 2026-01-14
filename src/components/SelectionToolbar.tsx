import { CheckSquare, Square, MinusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionToolbarProps {
  isAllSelected: boolean;
  isSomeSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function SelectionToolbar({
  isAllSelected,
  isSomeSelected,
  onSelectAll,
  onDeselectAll,
}: SelectionToolbarProps) {
  const handleToggleAll = () => {
    if (isAllSelected || isSomeSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const SelectIcon = isAllSelected 
    ? CheckSquare 
    : isSomeSelected 
      ? MinusSquare 
      : Square;

  return (
    <div className="flex flex-wrap items-center gap-3">
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
