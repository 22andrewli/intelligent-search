import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlattenedCode } from '@/types/codes';
import { cn } from '@/lib/utils';

interface DraggableCodeItemProps {
  code: FlattenedCode;
  onRemove: (code: string) => void;
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

export function DraggableCodeItem({ code, onRemove }: DraggableCodeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: code.code });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border p-3 bg-background transition-colors",
        isDragging ? "opacity-50 shadow-lg z-50" : "hover:bg-muted/50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'shrink-0 rounded-md px-2 py-0.5 text-xs font-mono font-semibold',
            getTypeBadgeClass(code.type)
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
  );
}
