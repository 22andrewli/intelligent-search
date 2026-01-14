import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FlattenedCode } from '@/types/codes';
import { DraggableCodeItem } from './DraggableCodeItem';
import { cn } from '@/lib/utils';

interface DroppableGroupProps {
  id: string;
  title: string;
  codes: FlattenedCode[];
  onRemove: (code: string) => void;
}

export function DroppableGroup({ id, title, codes, onRemove }: DroppableGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {codes.length} {codes.length === 1 ? 'code' : 'codes'}
        </span>
      </div>
      
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[80px] rounded-lg border-2 border-dashed p-2 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-muted",
          codes.length === 0 && "flex items-center justify-center"
        )}
      >
        {codes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Drag codes here
          </p>
        ) : (
          <SortableContext items={codes.map(c => c.code)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {codes.map((code) => (
                <DraggableCodeItem
                  key={code.code}
                  code={code}
                  onRemove={onRemove}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
