import { CodeType } from '@/types/codes';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CodeTypeFilterProps {
  value: CodeType | 'all';
  onChange: (value: CodeType | 'all') => void;
  counts: {
    all: number;
    icd10cm: number;
    hcpcs: number;
  };
}

export function CodeTypeFilter({ value, onChange, counts }: CodeTypeFilterProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CodeType | 'all')}>
      <TabsList className="h-11 p-1">
        <TabsTrigger 
          value="all" 
          className="px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          All Codes
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">
            {counts.all}
          </span>
        </TabsTrigger>
        <TabsTrigger 
          value="icd10cm"
          className="px-4 data-[state=active]:bg-code-icd data-[state=active]:text-primary-foreground"
        >
          ICD-10-CM
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-primary-foreground">
            {counts.icd10cm}
          </span>
        </TabsTrigger>
        <TabsTrigger 
          value="hcpcs"
          className="px-4 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
        >
          HCPCS/CPT
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-accent-foreground">
            {counts.hcpcs}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
