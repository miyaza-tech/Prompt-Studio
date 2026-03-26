#!/usr/bin/env python3
"""
Excel to JSON Converter for Prompt Studio
==========================================
Converts prompt_master.xlsx to normalized JSON files for the web app.

Output:
- data/csv/{sheet}.csv - Raw CSV exports
- src/data/raw/{sheet}.json - Raw JSON (unchanged values)
- src/data/normalized/fields.json - Category/field definitions
- src/data/normalized/options.json - All options grouped by category
- src/data/normalized/blocks.json - Model/block configurations
- src/data/normalized/meta.json - Parameter metadata
- src/data/normalized/row_counts.json - Row counts for validation
"""

import pandas as pd
import json
import re
from pathlib import Path
from typing import Any, Dict, List

# Paths
BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / "data" / "prompt_master.xlsx"
CSV_DIR = BASE_DIR / "data" / "csv"
RAW_JSON_DIR = BASE_DIR / "src" / "data" / "raw"
NORMALIZED_DIR = BASE_DIR / "src" / "data" / "normalized"

# Ensure directories exist
CSV_DIR.mkdir(parents=True, exist_ok=True)
RAW_JSON_DIR.mkdir(parents=True, exist_ok=True)
NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)


def clean_value(val: Any) -> str:
    """Clean and normalize a value. Returns empty string for NaN/None."""
    if pd.isna(val) or val is None:
        return ""
    return str(val).strip()


def has_korean(text: str) -> bool:
    """Check if text contains Korean characters."""
    return bool(re.search(r'[\uac00-\ud7a3]', text))


def extract_english_label(val: str) -> str:
    """Extract English part from bilingual labels.
    Handles formats like:
    - 'Smiling (미소)' -> 'Smiling'
    - 'Portrait (Indoor)(인물 사진 (실내))' -> 'Portrait (Indoor)'
    """
    if not val:
        return ""
    
    # Find the position of the first Korean character
    korean_match = re.search(r'[\uac00-\ud7a3]', val)
    if not korean_match:
        return val
    
    # Find the opening parenthesis before the first Korean
    korean_start = korean_match.start()
    # Look backwards for the opening parenthesis
    paren_pos = val.rfind('(', 0, korean_start)
    if paren_pos > 0:
        return val[:paren_pos].strip()
    
    return val


def extract_korean_label(val: str) -> str:
    """Extract Korean part from bilingual labels.
    Handles formats like:
    - 'Smiling (미소)' -> '미소'
    - 'Portrait (Indoor)(인물 사진 (실내))' -> '인물 사진 (실내)'
    """
    if not val:
        return ""
    
    # Find the position of the first Korean character
    korean_match = re.search(r'[\uac00-\ud7a3]', val)
    if not korean_match:
        return ""
    
    korean_start = korean_match.start()
    # Look backwards for the opening parenthesis
    paren_pos = val.rfind('(', 0, korean_start)
    if paren_pos > 0:
        # Extract from after '(' to before final ')'
        content = val[paren_pos+1:]
        if content.endswith(')'):
            content = content[:-1]
        return content.strip()
    
    return ""


def generate_id(text: str) -> str:
    """Generate a URL-safe ID from text."""
    if not text:
        return ""
    # Remove special characters, convert to lowercase, replace spaces with underscores
    cleaned = re.sub(r'[^a-zA-Z0-9\uac00-\ud7a3\s_-]', '', text)
    cleaned = re.sub(r'\s+', '_', cleaned.lower())
    return cleaned[:50]  # Limit length


def parse_structure_sheet(df: pd.DataFrame) -> Dict[str, List[Dict]]:
    """Parse the '\uad6c\uc870' sheet to extract field structure."""
    fields = []
    current_category = None
    sort_order = 0
    
    for idx, row in df.iterrows():
        col0 = clean_value(row.iloc[0])  # 카테고리
        col1 = clean_value(row.iloc[1])  # 필드명
        col2 = clean_value(row.iloc[2])  # 입력 타입
        col3 = clean_value(row.iloc[3])  # 옵션 소스
        col4 = clean_value(row.iloc[4]) if len(row) > 4 else ""  # 설명/힌트
        
        # Skip empty rows
        if not col0 and not col1:
            continue
            
        # New category
        if col0:
            current_category = col0
            
        # Field entry
        if col1:
            sort_order += 1
            field = {
                "field_id": generate_id(col1),
                "field_id_raw": col1,
                "category": current_category or "",
                "category_id": generate_id(current_category) if current_category else "",
                "label": col1,
                "label_raw": col1,
                "input_type": col2 or "text",
                "input_type_raw": col2,
                "option_source": col3,
                "option_source_raw": col3,
                "description": col4,
                "description_raw": col4,
                "sort_order": sort_order,
                "default_generated": False,
                "media_type": "video" if current_category == "영상" else "all"
            }
            fields.append(field)
    
    return {"fields": fields}


def parse_checkbox_sheet(df: pd.DataFrame) -> Dict[str, Any]:
    """Parse the '체크박스' sheet to extract options and parameters."""
    options = []
    params = []
    
    # Extract header row categories
    header_row = df.iloc[0]
    detected_categories = {}
    last_category = None
    
    for i, col in enumerate(df.columns):
        val = clean_value(header_row.get(col, ""))
        if val and val != "상단탭 B":
            # New category
            detected_categories[i] = {
                "name": val,
                "id": generate_id(val),
                "has_subgroups": False
            }
            last_category = i
        elif last_category is not None and not val:
            # Empty header - this column belongs to previous category
            # It contains the actual options (previous column has subgroup headers)
            if last_category in detected_categories:
                detected_categories[last_category]["has_subgroups"] = True
                detected_categories[i] = {
                    "name": detected_categories[last_category]["name"],
                    "id": detected_categories[last_category]["id"],
                    "is_option_column": True
                }
    
    # Extract parameters from column 0
    param_defs = []
    for idx in range(1, len(df)):
        row = df.iloc[idx]
        param_name = clean_value(row.iloc[0])
        if param_name and param_name.startswith("--"):
            param_info = {
                "param_id": param_name.replace("--", "").replace(" ", "_").replace("/", "_"),
                "param_name": param_name,
                "param_name_raw": param_name,
                "description": clean_value(row.iloc[4]) if len(row) > 4 else "",
                "sort_order": len(param_defs) + 1,
                "default_generated": False
            }
            param_defs.append(param_info)
    
    # Track subgroups for categories that have them
    current_subgroups = {}  # category_id -> current subgroup name
    
    # Extract options from each category column
    for col_idx, cat_info in detected_categories.items():
        if col_idx < 2:  # Skip first two columns (params area)
            continue
        
        # Skip subgroup header columns (process only option columns or simple columns)
        if cat_info.get("has_subgroups") and not cat_info.get("is_option_column"):
            continue
            
        category_id = cat_info["id"]
        category_name = cat_info["name"]
        
        # Find subgroup column if this is an option column
        subgroup_col = None
        if cat_info.get("is_option_column"):
            # Find the previous column that has the subgroup headers
            for prev_idx in range(col_idx - 1, -1, -1):
                if prev_idx in detected_categories and detected_categories[prev_idx].get("has_subgroups"):
                    subgroup_col = prev_idx
                    break
        
        current_subgroup = ""
        
        for row_idx in range(1, len(df)):
            row = df.iloc[row_idx]
            
            # Update subgroup if we have a subgroup column
            if subgroup_col is not None:
                subgroup_val = clean_value(row.iloc[subgroup_col]) if subgroup_col < len(row) else ""
                if subgroup_val and not subgroup_val.startswith("--"):
                    current_subgroup = subgroup_val
            
            val = clean_value(row.iloc[col_idx]) if col_idx < len(row) else ""
            
            if val and not val.startswith("--"):
                # Determine media_type based on category
                opt_media_type = "video" if category_name in ["카메라무빙", "효과", "오디오"] else "all"
                
                option = {
                    "option_id": generate_id(val),
                    "category_id": category_id,
                    "category_name": category_name,
                    "category_name_raw": category_name,
                    "value": extract_english_label(val) or val,
                    "value_raw": val,
                    "label": val,
                    "label_raw": val,
                    "label_en": extract_english_label(val),
                    "label_ko": extract_korean_label(val),
                    "group": current_subgroup,
                    "sort_order": row_idx,
                    "default_generated": False,
                    "media_type": opt_media_type,
                }
                options.append(option)
    
    # Deduplicate options
    seen = set()
    unique_options = []
    for opt in options:
        key = f"{opt['category_id']}:{opt['value_raw']}"
        if key not in seen:
            seen.add(key)
            unique_options.append(opt)
    
    return {
        "options": unique_options,
        "params": param_defs
    }



# Video-only categories
VIDEO_ONLY_CATEGORIES = {
    "카메라무빙", "효과", "오디오",
    "__fps", "__duration", "__motion", "__loop"
}

def parse_images_sheet(df: pd.DataFrame) -> Dict[str, str]:
    """Parse the 'image' sheet to extract option value -> image_url mapping.
    
    Handles various column layouts:
    - Standard: option_value (col 0), image_url (col 1)
    - With header row: option_value (col 1), image_url (col 2)
    """
    image_map = {}
    
    # Detect column layout by checking first row
    for idx, row in df.iterrows():
        # Try to find option_value and image_url columns
        option_value = ""
        image_url = ""
        
        # Check each column for values
        for col_idx in range(len(row)):
            val = clean_value(row.iloc[col_idx])
            if val and val.startswith('http'):
                image_url = val
            elif val and not val.startswith('--') and val not in ['상단탭 B', 'option_value', 'image_url']:
                if not option_value:  # Take first non-URL value as option_value
                    option_value = val
        
        if option_value and image_url:
            # Store both exact match and English-only match
            image_map[option_value] = image_url
            # Also extract English part for matching
            english_part = extract_english_label(option_value)
            if english_part and english_part != option_value:
                image_map[english_part] = image_url
    
    return image_map


def create_fields_from_categories(options: List[Dict]) -> List[Dict]:
    """Create field definitions from option categories."""
    categories = {}
    
    for opt in options:
        cat_id = opt["category_id"]
        if cat_id and cat_id not in categories:
            # Determine media_type based on category name
            cat_name = opt["category_name"]
            media_type = "video" if cat_name in VIDEO_ONLY_CATEGORIES else "all"
            
            categories[cat_id] = {
                "field_id": cat_id,
                "category_id": cat_id,
                "category": opt["category_name"],
                "category_raw": opt["category_name_raw"],
                "label": opt["category_name"],
                "label_raw": opt["category_name_raw"],
                "description": "",
                "input_type": "chips",
                "sort_order": len(categories) + 1,
                "default_generated": True,
                "media_type": media_type
            }
    
    return list(categories.values())


def create_blocks() -> List[Dict]:
    """Create model/block definitions.
    
    prompt_format determines output syntax:
    - midjourney: Uses --ar, --s, --c, --v parameters
    - stable_diffusion: Separate positive/negative prompts
    - natural: Plain comma-separated text (Runway, Sora, Kling, Seendance, Flux, etc.)
    """
    return [
        {
            "block_id": "midjourney",
            "label": "Midjourney",
            "prompt_format": "midjourney",
            "capabilities": {
                "aspect_ratio": True,
                "stylize": True,
                "chaos": True,
                "sref": True,
                "cref": True,
                "oref": True,
                "iw": True,
                "tile": True,
                "no": True,
                "draft": True,
                "stealth": True,
                "profile": True,
                "version": True,
                "fps": True,
                "duration": True,
                "motion": True,
                "loop": True
            },
            "param_defaults": {
                "ar": "1:1",
                "stylize": 100,
                "chaos": 0,
                "version": "7"
            },
            "sort_order": 1
        },
        {
            "block_id": "stable_diffusion",
            "label": "Stable Diffusion",
            "prompt_format": "stable_diffusion",
            "capabilities": {
                "steps": True,
                "cfg_scale": True,
                "no": True
            },
            "param_defaults": {
                "steps": 20,
                "cfg_scale": 7
            },
            "sort_order": 2
        },
        {
            "block_id": "natural",
            "label": "자연어 (Runway, Sora, Kling 등)",
            "prompt_format": "natural",
            "capabilities": {
                "aspect_ratio": True,
                "fps": True,
                "duration": True,
                "motion": True,
                "loop": True,
                "camera_movement": True
            },
            "param_defaults": {
                "ar": "16:9",
                "fps": 24,
                "duration": 5,
                "motion": 3
            },
            "sort_order": 3
        }
    ]


def create_meta() -> Dict[str, Any]:
    """Create parameter metadata."""
    return {
        "aspect_ratios": [
            {"value": "1:1", "label": "1:1 (Square)"},
            {"value": "16:9", "label": "16:9 (Landscape)"},
            {"value": "9:16", "label": "9:16 (Portrait)"},
            {"value": "4:3", "label": "4:3 (Standard)"},
            {"value": "3:4", "label": "3:4 (Portrait)"},
            {"value": "21:9", "label": "21:9 (Cinematic)"},
            {"value": "3:2", "label": "3:2 (Classic)"},
            {"value": "2:3", "label": "2:3 (Portrait Classic)"}
        ],
        "stylize_range": {"min": 0, "max": 1000, "default": 100},
        "chaos_range": {"min": 0, "max": 100, "default": 0},
        "fps_options": [2, 12, 24, 30, 60],
        "duration_range": {"min": 1, "max": 10, "unit": "seconds"},
        "motion_range": {"min": 1, "max": 5, "default": 3},
        "versions": [
            {"value": "7", "label": "V7 (Latest)"},
            {"value": "6.1", "label": "V6.1"},
            {"value": "6", "label": "V6"},
            {"value": "5.2", "label": "V5.2"},
            {"value": "niji", "label": "Niji (Anime)"}
        ],
        "image_weight_range": {"min": 0, "max": 2, "default": 1, "step": 0.1},
        "style_weight_range": {"min": 0, "max": 1000, "default": 100},
        "character_weight_range": {"min": 0, "max": 100, "default": 0},
        "default_negative_prompts": [
            "blurry", "low quality", "distorted", "deformed", 
            "bad anatomy", "watermark", "text", "signature"
        ]
    }


def main():
    """Main conversion process."""
    print("=" * 60)
    print("Prompt Studio - Excel to JSON Converter")
    print("=" * 60)
    
    # Check if Excel file exists
    if not EXCEL_PATH.exists():
        print(f"ERROR: Excel file not found at {EXCEL_PATH}")
        return
    
    print(f"\nReading Excel: {EXCEL_PATH}")
    
    # Read all sheets
    xl = pd.ExcelFile(EXCEL_PATH)
    sheets = xl.sheet_names
    print(f"Found sheets: {sheets}")
    
    row_counts = {
        "raw": {},
        "normalized": {}
    }
    
    # Export each sheet to CSV and raw JSON
    for sheet_name in sheets:
        print(f"\nProcessing sheet: {sheet_name}")
        df = pd.read_excel(EXCEL_PATH, sheet_name=sheet_name)
        
        # Save raw CSV
        csv_path = CSV_DIR / f"{sheet_name}.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"   CSV: {csv_path}")
        
        # Save raw JSON
        raw_json_path = RAW_JSON_DIR / f"{sheet_name}.json"
        # Convert to records, handling NaN
        records = df.fillna("").to_dict(orient='records')
        with open(raw_json_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"   Raw JSON: {raw_json_path}")
        
        row_counts["raw"][sheet_name] = len(records)
    
    # Parse structure sheet
    print("\nParsing structure data...")
    structure_df = pd.read_excel(EXCEL_PATH, sheet_name='\uad6c\uc870')
    structure_data = parse_structure_sheet(structure_df)
    
    # Parse checkbox sheet
    print("Parsing options data...")
    checkbox_df = pd.read_excel(EXCEL_PATH, sheet_name='\uccb4\ud06c\ubc15\uc2a4')
    options_data = parse_checkbox_sheet(checkbox_df)

    # Create fields from categories if structure is minimal
    all_options = options_data["options"]
    fields = create_fields_from_categories(all_options)
    
    # Parse images sheet if exists (supports '이미지' or 'image')
    image_map = {}
    image_sheet_name = None
    if '이미지' in sheets:
        image_sheet_name = '이미지'
    elif 'image' in sheets:
        image_sheet_name = 'image'
    
    if image_sheet_name:
        print(f"Parsing images data from '{image_sheet_name}' sheet...")
        images_df = pd.read_excel(EXCEL_PATH, sheet_name=image_sheet_name)
        image_map = parse_images_sheet(images_df)
        print(f"   Found {len(image_map)} image mappings")
    
    # Apply image URLs to options
    if image_map:
        matched_count = 0
        for opt in all_options:
            # Try to match by value, value_raw, or label_en
            image_url = (
                image_map.get(opt.get("value")) or
                image_map.get(opt.get("value_raw")) or
                image_map.get(opt.get("label_en")) or
                ""
            )
            opt["image_url"] = image_url
            if image_url:
                matched_count += 1
        print(f"   Matched {matched_count} options with images")
    else:
        # Add empty image_url field to all options
        for opt in all_options:
            opt["image_url"] = ""
    
    # Merge with structure fields
    structure_fields = structure_data.get("fields", [])
    if structure_fields:
        # Combine, preferring structure definitions
        field_ids = {f["field_id"] for f in fields}
        for sf in structure_fields:
            if sf["field_id"] not in field_ids:
                fields.append(sf)
    
    # Sort fields
    fields.sort(key=lambda x: x.get("sort_order", 999))
    
    # Save normalized JSON files
    print("\nSaving normalized JSON files...")
    
    # Fields
    fields_path = NORMALIZED_DIR / "fields.json"
    with open(fields_path, 'w', encoding='utf-8') as f:
        json.dump({"fields": fields, "count": len(fields)}, f, ensure_ascii=False, indent=2)
    print(f"   fields.json ({len(fields)} fields)")
    row_counts["normalized"]["fields"] = len(fields)
    
    # Options
    options_path = NORMALIZED_DIR / "options.json"
    with open(options_path, 'w', encoding='utf-8') as f:
        json.dump({"options": all_options, "count": len(all_options)}, f, ensure_ascii=False, indent=2)
    print(f"   options.json ({len(all_options)} options)")
    row_counts["normalized"]["options"] = len(all_options)
    
    # Params
    params = options_data.get("params", [])
    params_path = NORMALIZED_DIR / "params.json"
    with open(params_path, 'w', encoding='utf-8') as f:
        json.dump({"params": params, "count": len(params)}, f, ensure_ascii=False, indent=2)
    print(f"   params.json ({len(params)} params)")
    row_counts["normalized"]["params"] = len(params)
    
    # Blocks (models)
    blocks = create_blocks()
    blocks_path = NORMALIZED_DIR / "blocks.json"
    with open(blocks_path, 'w', encoding='utf-8') as f:
        json.dump({"blocks": blocks, "count": len(blocks)}, f, ensure_ascii=False, indent=2)
    print(f"   blocks.json ({len(blocks)} models)")
    row_counts["normalized"]["blocks"] = len(blocks)
    
    # Meta
    meta = create_meta()
    meta_path = NORMALIZED_DIR / "meta.json"
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print("   meta.json")
    
    # Row counts
    row_counts_path = NORMALIZED_DIR / "row_counts.json"
    with open(row_counts_path, 'w', encoding='utf-8') as f:
        json.dump(row_counts, f, ensure_ascii=False, indent=2)
    print("   row_counts.json")
    
    # Summary
    print("\n" + "=" * 60)
    print("Conversion Complete!")
    print("=" * 60)
    print("\nSummary:")
    print(f"   - Sheets processed: {len(sheets)}")
    print(f"   - Fields: {len(fields)}")
    print(f"   - Options: {len(all_options)}")
    print(f"   - Params: {len(params)}")
    print(f"   - Models: {len(blocks)}")
    
    # Validation warnings
    print("\nValidation Notes:")
    empty_labels = [o for o in all_options if not o.get("label")]
    if empty_labels:
        print(f"   - Options with empty labels: {len(empty_labels)}")
    
    empty_values = [o for o in all_options if not o.get("value")]
    if empty_values:
        print(f"   - Options with empty values: {len(empty_values)}")
    
    # Check for duplicates
    value_counts = {}
    for opt in all_options:
        key = f"{opt['category_id']}:{opt['value']}"
        value_counts[key] = value_counts.get(key, 0) + 1
    duplicates = {k: v for k, v in value_counts.items() if v > 1}
    if duplicates:
        print(f"   - Duplicate values in same category: {len(duplicates)}")
    
    print("\nRun 'npm run dev' to start the app!")


if __name__ == "__main__":
    main()
