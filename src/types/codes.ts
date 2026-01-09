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
