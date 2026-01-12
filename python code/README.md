# ICD-10-CM Code Hierarchy Generator

This tool generates hierarchical XML and JSON representations of ICD-10-CM (International Classification of Diseases, 10th Revision, Clinical Modification) codes.

## Features

- Fetches ICD-10-CM code data from the NLM Clinical Tables API
- Organizes codes into a hierarchical tree structure
- Outputs in both XML and JSON formats
- Supports custom code lists or sample codes

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage (Sample Codes)

Generate both XML and JSON hierarchies using sample codes:

```bash
python icd10cm_hierarchy.py
```

### Specify Output Format

Generate only JSON:
```bash
python icd10cm_hierarchy.py --format json
```

Generate only XML:
```bash
python icd10cm_hierarchy.py --format xml
```

### Use Custom Code List

Create a text file with one ICD-10-CM code per line (e.g., `codes.txt`):
```
A00
A00.0
A00.1
I10
I20.0
```

Then run:
```bash
python icd10cm_hierarchy.py --codes-file codes.txt
```

### Specify Output Directory

```bash
python icd10cm_hierarchy.py --output-dir ./output
```

## Output Format

### JSON Structure

```json
{
  "icd10cm": {
    "codes": [
      {
        "code": "A00",
        "name": "Cholera",
        "level": 1,
        "children": [
          {
            "code": "A00.0",
            "name": "Cholera due to Vibrio cholerae 01, biovar cholerae",
            "level": 2,
            "children": []
          }
        ]
      }
    ]
  }
}
```

### XML Structure

```xml
<?xml version="1.0" ?>
<icd10cm>
  <code value="A00" level="1">
    <name>Cholera</name>
    <children>
      <code value="A00.0" level="2">
        <name>Cholera due to Vibrio cholerae 01, biovar cholerae</name>
        <children/>
      </code>
    </children>
  </code>
</icd10cm>
```

## ICD-10-CM Code Structure

ICD-10-CM codes follow this hierarchy:

- **Level 1**: Category (3 characters, e.g., `A00`)
- **Level 2**: Subcategory (4-5 characters, e.g., `A00.0`)
- **Level 3-5**: Additional specificity (6-7 characters, e.g., `A00.01`)

Codes are organized into chapters:
- A00-B99: Certain infectious and parasitic diseases
- C00-D49: Neoplasms
- E00-E89: Endocrine, nutritional and metabolic diseases
- F01-F99: Mental, Behavioral and Neurodevelopmental disorders
- I00-I99: Diseases of the circulatory system
- J00-J99: Diseases of the respiratory system
- And more...

## API Usage

The script uses the [NLM Clinical Tables API](https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html) to fetch code descriptions. The API is free and does not require authentication.

## Notes

- The script includes sample codes covering multiple chapters for demonstration
- For production use with full code sets, consider using official ICD-10-CM data files
- Network connectivity is required to fetch code descriptions from the API

## License

This tool is provided as-is for educational and research purposes.

