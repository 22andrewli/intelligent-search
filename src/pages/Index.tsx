import { useCodeSearch } from '@/hooks/useCodeSearch';
import { CodeSearchHeader } from '@/components/CodeSearchHeader';
import { CodeTypeFilter } from '@/components/CodeTypeFilter';
import { SelectionToolbar } from '@/components/SelectionToolbar';
import { CodeResultsList } from '@/components/CodeResultsList';
import { SelectedCodesPanel } from '@/components/SelectedCodesPanel';
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
    searchFilteredCounts,
    totalCodes,
    allCodes,
  } = useCodeSearch();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient accent */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-[1600px] py-8">
          <CodeSearchHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalCodes={totalCodes}
            filteredCount={filteredCodes.length}
            selectedCount={selectedCodes.size}
          />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="container max-w-[1600px] py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Main Search and Results */}
          <Card className="p-6">
            {/* Filters Row */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CodeTypeFilter
                value={codeTypeFilter}
                onChange={setCodeTypeFilter}
                counts={searchFilteredCounts}
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

          {/* Right Column - Selected Codes Panel */}
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-120px)]">
            <SelectedCodesPanel
              selectedCodes={selectedCodes}
              allCodes={allCodes}
              onRemove={toggleCode}
              onClearAll={deselectAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
