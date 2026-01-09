import { useMemo } from 'react';
import { useCodeSearch } from '@/hooks/useCodeSearch';
import { CodeSearchHeader } from '@/components/CodeSearchHeader';
import { CodeTypeFilter } from '@/components/CodeTypeFilter';
import { SelectionToolbar } from '@/components/SelectionToolbar';
import { CodeResultsList } from '@/components/CodeResultsList';
import { Card } from '@/components/ui/card';

const Index = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCodes,
    toggleCode,
    selectAll,
    deselectAll,
    isAllSelected,
    isSomeSelected,
    codeTypeFilter,
    setCodeTypeFilter,
    filteredCodes,
    totalCodes,
  } = useCodeSearch();

  const counts = useMemo(() => ({
    all: filteredCodes.length,
    icd10cm: filteredCodes.filter(c => c.type === 'icd10cm').length,
    hcpcs: filteredCodes.filter(c => c.type === 'hcpcs').length,
    ndc: filteredCodes.filter(c => c.type === 'ndc').length,
  }), [filteredCodes]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient accent */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-5xl py-8">
          <CodeSearchHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalCodes={totalCodes}
            filteredCount={filteredCodes.length}
            selectedCount={selectedCodes.size}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-5xl py-6">
        <Card className="p-6">
          {/* Filters Row */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CodeTypeFilter
              value={codeTypeFilter}
              onChange={setCodeTypeFilter}
              counts={counts}
            />
            <SelectionToolbar
              isAllSelected={isAllSelected}
              isSomeSelected={isSomeSelected}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              selectedCodes={selectedCodes}
              filteredCodes={filteredCodes}
            />
          </div>

          {/* Results */}
          <CodeResultsList
            codes={filteredCodes}
            selectedCodes={selectedCodes}
            onToggle={toggleCode}
            searchQuery={searchQuery}
            codeTypeFilter={codeTypeFilter}
          />
        </Card>
      </div>
    </div>
  );
};

export default Index;
