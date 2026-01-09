export interface NDCCode {
  code: string;
  name: string;
  manufacturer: string;
  packageSize: string;
}

export const ndcCodes: NDCCode[] = [
  { code: "0002-3227-30", name: "Humalog (Insulin Lispro) 100 units/mL", manufacturer: "Eli Lilly", packageSize: "10 mL vial" },
  { code: "0002-7510-01", name: "Trulicity (Dulaglutide) 1.5 mg/0.5 mL", manufacturer: "Eli Lilly", packageSize: "4 pens/box" },
  { code: "0006-0749-31", name: "Januvia (Sitagliptin) 100 mg", manufacturer: "Merck", packageSize: "30 tablets" },
  { code: "0006-0277-31", name: "Keytruda (Pembrolizumab) 100 mg/4 mL", manufacturer: "Merck", packageSize: "1 vial" },
  { code: "0069-0150-01", name: "Lipitor (Atorvastatin) 10 mg", manufacturer: "Pfizer", packageSize: "90 tablets" },
  { code: "0069-2700-30", name: "Viagra (Sildenafil) 100 mg", manufacturer: "Pfizer", packageSize: "30 tablets" },
  { code: "0074-3799-13", name: "Humira (Adalimumab) 40 mg/0.4 mL", manufacturer: "AbbVie", packageSize: "2 pens/box" },
  { code: "0074-6624-02", name: "Rinvoq (Upadacitinib) 15 mg", manufacturer: "AbbVie", packageSize: "30 tablets" },
  { code: "0078-0357-15", name: "Entresto (Sacubitril/Valsartan) 97/103 mg", manufacturer: "Novartis", packageSize: "60 tablets" },
  { code: "0078-0620-61", name: "Cosentyx (Secukinumab) 150 mg/mL", manufacturer: "Novartis", packageSize: "2 pens/box" },
  { code: "0173-0519-00", name: "Advair Diskus 250/50", manufacturer: "GlaxoSmithKline", packageSize: "60 doses" },
  { code: "0173-0881-20", name: "Trelegy Ellipta 100/62.5/25", manufacturer: "GlaxoSmithKline", packageSize: "30 doses" },
  { code: "0310-0751-60", name: "Ozempic (Semaglutide) 1 mg", manufacturer: "Novo Nordisk", packageSize: "3 mL pen" },
  { code: "0310-6520-01", name: "Wegovy (Semaglutide) 2.4 mg", manufacturer: "Novo Nordisk", packageSize: "4 pens/box" },
  { code: "0310-1660-10", name: "Victoza (Liraglutide) 1.8 mg/3 mL", manufacturer: "Novo Nordisk", packageSize: "3 pens/box" },
  { code: "0591-0405-01", name: "Lisinopril 10 mg", manufacturer: "Actavis", packageSize: "100 tablets" },
  { code: "0591-2234-01", name: "Metformin HCl 500 mg", manufacturer: "Actavis", packageSize: "100 tablets" },
  { code: "50242-0040-01", name: "Rituxan (Rituximab) 100 mg/10 mL", manufacturer: "Genentech", packageSize: "1 vial" },
  { code: "50242-0912-01", name: "Avastin (Bevacizumab) 400 mg/16 mL", manufacturer: "Genentech", packageSize: "1 vial" },
  { code: "50242-0082-01", name: "Herceptin (Trastuzumab) 440 mg", manufacturer: "Genentech", packageSize: "1 vial" },
  { code: "59148-0070-90", name: "Eliquis (Apixaban) 5 mg", manufacturer: "Bristol-Myers Squibb", packageSize: "90 tablets" },
  { code: "59148-0050-60", name: "Eliquis (Apixaban) 2.5 mg", manufacturer: "Bristol-Myers Squibb", packageSize: "60 tablets" },
  { code: "63459-0302-43", name: "Farxiga (Dapagliflozin) 10 mg", manufacturer: "AstraZeneca", packageSize: "30 tablets" },
  { code: "63459-0501-30", name: "Symbicort 160/4.5", manufacturer: "AstraZeneca", packageSize: "120 doses" },
  { code: "68180-0352-09", name: "Atorvastatin 40 mg", manufacturer: "Lupin", packageSize: "90 tablets" },
  { code: "68180-0757-06", name: "Amlodipine 5 mg", manufacturer: "Lupin", packageSize: "30 tablets" },
  { code: "00093-5264-01", name: "Omeprazole 20 mg", manufacturer: "Teva", packageSize: "30 capsules" },
  { code: "00093-0833-01", name: "Gabapentin 300 mg", manufacturer: "Teva", packageSize: "100 capsules" },
  { code: "00378-1800-01", name: "Levothyroxine 50 mcg", manufacturer: "Mylan", packageSize: "100 tablets" },
  { code: "00378-4025-01", name: "Pantoprazole 40 mg", manufacturer: "Mylan", packageSize: "30 tablets" },
];
