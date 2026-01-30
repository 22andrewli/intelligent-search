export type CodeType = 'icd10cm' | 'hcpcs' | 'ndc';

export interface ICD10Code {
  code: string;
  name: string;
  level: number;
  children?: ICD10Code[];
}

export interface HCPCSCode {
  code: string;
  name: string;
  category: string;
}

export interface NDCCode {
  code: string;
  name: string;
  manufacturer: string;
  packageSize: string;
}

export interface FlattenedCode {
  code: string;
  name: string;
  type: CodeType;
  category?: string;
  level?: number;
  parentCode?: string;
  manufacturer?: string;
  packageSize?: string;
}

/** Accepted CSV upload row. Columns (in order): code_group, code_category, code_type, code_value, code_desc (optional). */
export interface ImportedCSVRow {
  code_group: string;
  code_category?: string;
  code_type: string; // NDC, ICD10, or HCPCS
  code_value: string;
  code_desc?: string;
}
