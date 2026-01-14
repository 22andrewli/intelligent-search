import { useMemo, useState, useCallback } from 'react';
import { CheckSquare, Download } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlattenedCode } from '@/types/codes';
import { toast } from 'sonner';
import { DroppableGroup } from './DroppableGroup';

interface SelectedCodesPanelProps {
  selectedCodes: Set<string>;
  allCodes: FlattenedCode[];
  onRemove: (code: string) => void;
  onClearAll: () => void;
}

type GroupId = 'group1' | 'group2' | 'group3';

interface GroupState {
  group1: string[];
  group2: string[];
  group3: string[];
}

export function SelectedCodesPanel({
  selectedCodes,
  allCodes,
  onRemove,
  onClearAll,
}: SelectedCodesPanelProps) {
  const [groups, setGroups] = useState<GroupState>({
    group1: [],
    group2: [],
    group3: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build a map for quick lookup
  const codeMap = useMemo(() => {
    const map = new Map<string, FlattenedCode>();
    allCodes.forEach(code => {
      map.set(code.code, code);
    });
    return map;
  }, [allCodes]);

  // Sync groups with selected codes - add new codes to group1, remove deselected codes
  const syncedGroups = useMemo(() => {
    const allGroupedCodes = new Set([...groups.group1, ...groups.group2, ...groups.group3]);
    const selectedArray = Array.from(selectedCodes);
    
    // Find codes that are selected but not in any group
    const unassignedCodes = selectedArray.filter(code => !allGroupedCodes.has(code));
    
    // Filter out codes that are no longer selected from each group
    const filteredGroup1 = groups.group1.filter(code => selectedCodes.has(code));
    const filteredGroup2 = groups.group2.filter(code => selectedCodes.has(code));
    const filteredGroup3 = groups.group3.filter(code => selectedCodes.has(code));
    
    return {
      group1: [...filteredGroup1, ...unassignedCodes],
      group2: filteredGroup2,
      group3: filteredGroup3,
    };
  }, [selectedCodes, groups]);

  // Get FlattenedCode objects for each group
  const groupedCodes = useMemo(() => {
    return {
      group1: syncedGroups.group1.map(code => codeMap.get(code)).filter((c): c is FlattenedCode => c !== undefined),
      group2: syncedGroups.group2.map(code => codeMap.get(code)).filter((c): c is FlattenedCode => c !== undefined),
      group3: syncedGroups.group3.map(code => codeMap.get(code)).filter((c): c is FlattenedCode => c !== undefined),
    };
  }, [syncedGroups, codeMap]);

  const findCodeGroup = useCallback((codeId: string): GroupId | null => {
    if (syncedGroups.group1.includes(codeId)) return 'group1';
    if (syncedGroups.group2.includes(codeId)) return 'group2';
    if (syncedGroups.group3.includes(codeId)) return 'group3';
    return null;
  }, [syncedGroups]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeGroup = findCodeGroup(activeId);
    if (!activeGroup) return;

    // Determine target group
    let targetGroup: GroupId;
    if (['group1', 'group2', 'group3'].includes(overId)) {
      targetGroup = overId as GroupId;
    } else {
      const overGroup = findCodeGroup(overId);
      if (!overGroup) return;
      targetGroup = overGroup;
    }

    setGroups(prev => {
      const newGroups = { ...prev };
      
      // Remove from source group
      newGroups[activeGroup] = syncedGroups[activeGroup].filter(id => id !== activeId);
      
      if (activeGroup === targetGroup) {
        // Reorder within same group
        const oldIndex = syncedGroups[activeGroup].indexOf(activeId);
        const newIndex = syncedGroups[activeGroup].indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          newGroups[activeGroup] = arrayMove(syncedGroups[activeGroup], oldIndex, newIndex);
        }
      } else {
        // Move to target group
        if (overId === targetGroup) {
          // Dropped on the group container itself
          newGroups[targetGroup] = [...syncedGroups[targetGroup], activeId];
        } else {
          // Dropped on a specific item
          const overIndex = syncedGroups[targetGroup].indexOf(overId);
          const newTargetItems = [...syncedGroups[targetGroup]];
          newTargetItems.splice(overIndex, 0, activeId);
          newGroups[targetGroup] = newTargetItems;
        }
      }
      
      return newGroups;
    });
  }, [findCodeGroup, syncedGroups]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeGroup = findCodeGroup(activeId);
    if (!activeGroup) return;

    // Determine if we're over a different group
    let targetGroup: GroupId | null = null;
    if (['group1', 'group2', 'group3'].includes(overId)) {
      targetGroup = overId as GroupId;
    } else {
      targetGroup = findCodeGroup(overId);
    }

    if (targetGroup && targetGroup !== activeGroup) {
      setGroups(prev => {
        const newGroups = { ...prev };
        
        // Remove from source
        newGroups[activeGroup] = syncedGroups[activeGroup].filter(id => id !== activeId);
        
        // Add to target
        if (overId === targetGroup) {
          newGroups[targetGroup] = [...syncedGroups[targetGroup], activeId];
        } else {
          const overIndex = syncedGroups[targetGroup].indexOf(overId);
          const newTargetItems = [...syncedGroups[targetGroup]];
          newTargetItems.splice(overIndex >= 0 ? overIndex : newTargetItems.length, 0, activeId);
          newGroups[targetGroup] = newTargetItems;
        }
        
        return newGroups;
      });
    }
  }, [findCodeGroup, syncedGroups]);

  const allItems = useMemo(() => {
    return [...groupedCodes.group1, ...groupedCodes.group2, ...groupedCodes.group3];
  }, [groupedCodes]);

  const handleExportCSV = () => {
    const csv = [
      'Code,Description,Type,Category,Group',
      ...groupedCodes.group1.map(c => `"${c.code}","${c.name}","${c.type}","${c.category || ''}","Group 1"`),
      ...groupedCodes.group2.map(c => `"${c.code}","${c.name}","${c.type}","${c.category || ''}","Group 2"`),
      ...groupedCodes.group3.map(c => `"${c.code}","${c.name}","${c.type}","${c.category || ''}","Group 3"`),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected_codes.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${allItems.length} codes`);
  };

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
        <div className="p-4 space-y-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <DroppableGroup
              id="group1"
              title="Group 1"
              codes={groupedCodes.group1}
              onRemove={onRemove}
            />
            <DroppableGroup
              id="group2"
              title="Group 2"
              codes={groupedCodes.group2}
              onRemove={onRemove}
            />
            <DroppableGroup
              id="group3"
              title="Group 3"
              codes={groupedCodes.group3}
              onRemove={onRemove}
            />
          </DndContext>
        </div>
      </ScrollArea>
    </Card>
  );
}
