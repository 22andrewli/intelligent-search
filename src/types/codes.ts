export type CodeType = 'icd10cm' | 'hcpcs';

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

export interface FlattenedCode {
  code: string;
  name: string;
  type: CodeType;
  category?: string;
  level?: number;
  parentCode?: string;
}
