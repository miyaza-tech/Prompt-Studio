#!/usr/bin/env python3
"""
Excel v2 to JSON Converter for Prompt Studio
=============================================
Converts prompt_master_v2.xlsx to normalized JSON files for the web app.

Input sheets:
- Token_DB → options.json (token definitions)
- Group_DB → groups.json (category/group structure, sort order, selection rules)
- Image_Map → merged into options.json as image_url
- Model_DB → blocks.json (AI model definitions, capabilities, defaults)

Output:
- src/data/normalized/options.json
- src/data/normalized/fields.json
- src/data/normalized/groups.json  (NEW)
- src/data/normalized/blocks.json  (from Model_DB sheet)
- src/data/normalized/meta.json    (preserved from create_meta)
- src/data/normalized/params.json
- src/data/normalized/row_counts.json
"""

import pandas as pd
import json
import re
from pathlib import Path
from typing import Any, Dict, List

# Paths
BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / "data" / "prompt_master_v2.xlsx"
NORMALIZED_DIR = BASE_DIR / "src" / "data" / "normalized"

NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)


def clean_value(val: Any) -> str:
    """Clean and normalize a value."""
    if pd.isna(val) or val is None:
        return ""
    return str(val).strip().replace("\n", " ")


def extract_english_label(val: str) -> str:
    """Extract English part from bilingual labels like 'Smiling (미소)'."""
    if not val:
        return ""
    korean_match = re.search(r'[\uac00-\ud7a3]', val)
    if not korean_match:
        return val
    korean_start = korean_match.start()
    paren_pos = val.rfind('(', 0, korean_start)
    if paren_pos > 0:
        return val[:paren_pos].strip()
    return val


def extract_korean_label(val: str) -> str:
    """Extract Korean part from bilingual labels like 'Smiling (미소)'.
    Also handles description format like '(한글 설명)' where paren is at pos 0.
    """
    if not val:
        return ""
    korean_match = re.search(r'[\uac00-\ud7a3]', val)
    if not korean_match:
        return ""
    korean_start = korean_match.start()
    paren_pos = val.rfind('(', 0, korean_start)
    if paren_pos > 0:
        # Standard bilingual: "English (한글)"
        content = val[paren_pos + 1:]
        if content.endswith(')'):
            content = content[:-1]
        return content.strip()
    elif paren_pos == 0:
        # Description format: "(한글 설명)" - strip outer parens
        content = val[1:]
        if content.endswith(')'):
            content = content[:-1]
        return content.strip()
    # Korean without parens - return the Korean portion
    return val[korean_start:].strip()


# ──────────────────────────────────────────────
# Category sort order fallback
# This defines the default prompt assembly order.
# Group_DB.sort_order will override when present.
# ──────────────────────────────────────────────
CATEGORY_SORT_FALLBACK: Dict[str, int] = {
    "장르": 1,
    "샷구성": 2,
    "포즈 구도": 3,
    "표정": 4,
    "조명": 5,
    "색채": 6,
    "분위기": 7,
    "카메라&렌즈": 8,
    "렌즈종류": 9,
    "렌즈기법/포커스": 10,
    "필름 톤": 11,
    "구도": 12,
    "시점/관점": 13,
    "품질 & 디테일": 14,
    "렌더링": 15,
    "배경 디테일": 16,
    "카메라무빙": 17,
    "효과": 18,
    "상단탭 B": 19,
}

# Category → UI nav section grouping
CATEGORY_NAV_SECTIONS = [
    {"section": "콘텐츠", "categories": ["장르"]},
    {"section": "피사체", "categories": ["포즈 구도", "표정", "배경 디테일"]},
    {"section": "샷 & 구도", "categories": ["샷구성", "구도", "시점/관점"]},
    {"section": "카메라 & 렌즈", "categories": ["카메라&렌즈", "렌즈종류", "렌즈기법/포커스"]},
    {"section": "조명 & 색감", "categories": ["조명", "색채", "필름 톤", "분위기"]},
    {"section": "품질 & 렌더링", "categories": ["렌더링", "품질 & 디테일"]},
    {"section": "영상 효과", "categories": ["카메라무빙", "효과"]},
]

# Default selection_mode per category
SELECTION_MODE_DEFAULTS: Dict[str, str] = {
    # Most categories allow multiple selection
}

VIDEO_ONLY_CATEGORIES = {"카메라무빙", "효과"}


# ──────────────────────────────────────────────
# Parse Token_DB → options
# ──────────────────────────────────────────────
def parse_token_db(df: pd.DataFrame) -> List[Dict]:
    """Parse Token_DB sheet into option records."""
    options = []
    for idx, row in df.iterrows():
        token_id = clean_value(row.get("token_id", ""))
        category = clean_value(row.get("category", ""))
        category_key = clean_value(row.get("category_key", ""))
        group = clean_value(row.get("group", ""))
        group_key = clean_value(row.get("group_key", ""))
        token_value = clean_value(row.get("token_value", ""))
        display_label = clean_value(row.get("display_label", ""))
        token_label_short = clean_value(row.get("token_label_short", ""))
        description = clean_value(row.get("description", ""))
        raw = clean_value(row.get("raw", ""))
        source_row = int(row.get("source_row", idx)) if pd.notna(row.get("source_row")) else idx
        token_key = clean_value(row.get("token_key", ""))

        if not token_id or not category:
            continue

        # Determine English/Korean labels
        label_en = token_label_short or extract_english_label(display_label) or token_value
        # Try display_label first, then raw, then description for Korean
        label_ko = extract_korean_label(display_label) or extract_korean_label(raw) or extract_korean_label(description)

        # Determine media type
        media_type = "video" if category in VIDEO_ONLY_CATEGORIES else "all"

        option = {
            "option_id": token_id,
            "category_id": category_key,
            "category_name": category,
            "category_name_raw": category,
            "group": group,
            "group_key": group_key,
            "value": label_en or token_value,
            "value_raw": token_value,
            "label": display_label or token_value,
            "label_raw": display_label or token_value,
            "label_en": label_en,
            "label_ko": label_ko,
            "description": description,
            "sort_order": source_row,
            "default_generated": False,
            "media_type": media_type,
            "image_url": "",
            "token_key": token_key,
        }
        options.append(option)

    return options


# ──────────────────────────────────────────────
# Parse Group_DB → groups + fields
# ──────────────────────────────────────────────
def parse_group_db(df: pd.DataFrame, all_options: List[Dict]) -> tuple:
    """Parse Group_DB sheet into group records and field records."""
    groups = []
    seen_categories: Dict[str, int] = {}  # category -> sort order

    for idx, row in df.iterrows():
        category = clean_value(row.get("category", ""))
        group = clean_value(row.get("group", ""))
        group_display_name = clean_value(row.get("group_display_name", ""))
        sort_order = row.get("sort_order") if pd.notna(row.get("sort_order")) else None

        if not category:
            continue

        # Generate category_key from options (find first matching)
        category_key = ""
        for opt in all_options:
            if opt["category_name"] == category:
                category_key = opt["category_id"]
                break

        if not category_key:
            # Generate fallback key
            category_key = re.sub(r'[^a-zA-Z0-9\uac00-\ud7a3\s_-]', '', category)
            category_key = re.sub(r'\s+', '_', category_key.lower())[:50]

        # Generate group_key
        group_key = ""
        for opt in all_options:
            if opt["category_name"] == category and opt["group"] == group:
                group_key = opt["group_key"]
                break

        cat_sort = CATEGORY_SORT_FALLBACK.get(category, 99)
        if category not in seen_categories:
            seen_categories[category] = cat_sort

        # Selection mode default
        selection_mode = SELECTION_MODE_DEFAULTS.get(category, "multi")

        group_record = {
            "category": category,
            "category_key": category_key,
            "group": group,
            "group_key": group_key,
            "group_display_name": group_display_name or group.replace(f"{category}_", "").replace("_default", "").strip() or category,
            "category_sort_order": cat_sort,
            "group_sort_order": int(sort_order) if sort_order else idx + 1,
            "selection_mode": selection_mode,
            "mutex_group": "",
            "output_joiner": ", ",
        }
        groups.append(group_record)

    # Sort groups
    groups.sort(key=lambda g: (g["category_sort_order"], g["group_sort_order"]))

    # Build fields from unique categories
    fields = []
    for category, cat_sort in sorted(seen_categories.items(), key=lambda x: x[1]):
        category_key = ""
        for g in groups:
            if g["category"] == category:
                category_key = g["category_key"]
                break

        media_type = "video" if category in VIDEO_ONLY_CATEGORIES else "all"

        fields.append({
            "field_id": category_key,
            "category_id": category_key,
            "category": category,
            "category_raw": category,
            "label": category,
            "label_raw": category,
            "description": "",
            "input_type": "chips",
            "sort_order": cat_sort,
            "default_generated": True,
            "media_type": media_type,
        })

    return groups, fields


# ──────────────────────────────────────────────
# Parse Image_Map
# ──────────────────────────────────────────────
def parse_image_map(df: pd.DataFrame) -> Dict[str, str]:
    """Parse Image_Map sheet into option_value → image_url mapping."""
    image_map = {}
    for _, row in df.iterrows():
        option_value = clean_value(row.get("option_value", ""))
        image_url = clean_value(row.get("image_url", ""))
        if option_value and image_url:
            image_map[option_value] = image_url
            # Also store English-only key
            en_part = extract_english_label(option_value)
            if en_part and en_part != option_value:
                image_map[en_part] = image_url
    return image_map


# ──────────────────────────────────────────────
# Model/Block definitions (preserved from v1)
# ──────────────────────────────────────────────
def parse_model_db(df: pd.DataFrame) -> List[Dict]:
    """Parse Model_DB sheet into block definitions.
    
    Reads model data from Excel instead of hardcoding.
    Columns: block_id, label, prompt_format, version, sort_order,
             default_*, cap_*
    """
    CAP_FIELDS = [
        "aspect_ratio", "stylize", "chaos", "sref", "cref", "oref", "iw",
        "tile", "no", "draft", "stealth", "profile", "version",
        "fps", "duration", "motion", "loop", "camera_movement",
        "steps", "cfg_scale", "style", "guidance",
    ]
    DEFAULT_FIELDS = [
        "ar", "stylize", "chaos", "version",
        "fps", "duration", "motion", "steps", "cfg_scale",
    ]
    
    blocks = []
    for _, row in df.iterrows():
        block_id = clean_value(row.get("block_id", ""))
        if not block_id:
            continue
        
        # Build capabilities dict
        capabilities = {}
        for cap in CAP_FIELDS:
            col_name = f"cap_{cap}"
            val = row.get(col_name, "")
            if isinstance(val, bool):
                capabilities[cap] = val
            else:
                capabilities[cap] = str(val).strip().upper() == "TRUE"
        
        # Build param_defaults dict (skip empty/NaN values)
        param_defaults = {}
        for param in DEFAULT_FIELDS:
            col_name = f"default_{param}"
            val = row.get(col_name, "")
            if pd.isna(val) or val == "":
                continue
            # Try numeric conversion
            str_val = str(val).strip()
            if str_val:
                try:
                    # Integer?
                    if "." not in str_val:
                        param_defaults[param] = int(str_val)
                    else:
                        param_defaults[param] = float(str_val)
                except ValueError:
                    param_defaults[param] = str_val
        
        block = {
            "block_id": block_id,
            "label": clean_value(row.get("label", "")),
            "prompt_format": clean_value(row.get("prompt_format", "")),
            "capabilities": capabilities,
            "param_defaults": param_defaults,
            "sort_order": int(row.get("sort_order", 999)),
        }
        
        version = clean_value(row.get("version", ""))
        if version:
            block["version"] = version
        
        blocks.append(block)
    
    # Sort by sort_order
    blocks.sort(key=lambda b: b["sort_order"])
    return blocks


def create_meta() -> Dict:
    """Create parameter metadata (preserved from v1)."""
    return {
        "aspect_ratios": [
            {"value": "1:1", "label": "1:1"},
            {"value": "4:3", "label": "4:3"},
            {"value": "3:4", "label": "3:4"},
            {"value": "16:9", "label": "16:9"},
            {"value": "9:16", "label": "9:16"},
            {"value": "3:2", "label": "3:2"},
            {"value": "2:3", "label": "2:3"},
            {"value": "21:9", "label": "21:9"},
        ],
        "stylize_range": {"min": 0, "max": 1000, "default": 100, "step": 1},
        "chaos_range": {"min": 0, "max": 100, "default": 0, "step": 1},
        "fps_options": [12, 15, 24, 30, 60],
        "duration_range": {"min": 2, "max": 16, "default": 4, "unit": "seconds"},
        "motion_range": {"min": 1, "max": 5, "default": 3},
        "versions": [
            {"value": "7", "label": "v7"},
            {"value": "6.1", "label": "v6.1"},
            {"value": "6", "label": "v6"},
            {"value": "5.2", "label": "v5.2"},
            {"value": "niji", "label": "Niji"},
        ],
        "image_weight_range": {"min": 0, "max": 2, "default": 1, "step": 0.1},
        "style_weight_range": {"min": 0, "max": 1000, "default": 100, "step": 1},
        "character_weight_range": {"min": 0, "max": 100, "default": 0, "step": 1},
        "default_negative_prompts": [
            "ugly", "blurry", "low quality", "deformed", "bad anatomy",
            "watermark", "text", "signature",
        ],
    }


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    print("=" * 60)
    print("Prompt Studio - Excel v2 Converter")
    print("=" * 60)
    print(f"\nReading: {EXCEL_PATH}")

    xl = pd.ExcelFile(EXCEL_PATH)
    print(f"Sheets: {xl.sheet_names}")

    row_counts = {"raw": {}, "normalized": {}}

    # ── 1. Parse Token_DB ──
    print("\n[1/6] Parsing Token_DB...")
    token_df = pd.read_excel(EXCEL_PATH, sheet_name="Token_DB")
    all_options = parse_token_db(token_df)
    print(f"   {len(all_options)} tokens parsed")
    row_counts["raw"]["Token_DB"] = len(token_df)

    # ── 2. Parse Group_DB ──
    print("[2/6] Parsing Group_DB...")
    group_df = pd.read_excel(EXCEL_PATH, sheet_name="Group_DB")
    groups, fields = parse_group_db(group_df, all_options)
    print(f"   {len(groups)} groups, {len(fields)} categories")
    row_counts["raw"]["Group_DB"] = len(group_df)

    # ── 3. Parse Image_Map ──
    print("[3/6] Parsing Image_Map...")
    image_df = pd.read_excel(EXCEL_PATH, sheet_name="Image_Map")
    image_map = parse_image_map(image_df)
    print(f"   {len(image_map)} image mappings")
    row_counts["raw"]["Image_Map"] = len(image_df)

    # Apply image URLs to options
    matched_count = 0
    for opt in all_options:
        url = (
            image_map.get(opt["value_raw"])
            or image_map.get(opt["value"])
            or image_map.get(opt["label_en"])
            or image_map.get(opt["label_raw"])
            or ""
        )
        if url:
            opt["image_url"] = url
            matched_count += 1
    print(f"   {matched_count} options matched with images")

    # ── 4. Parse Model_DB ──
    print("[4/6] Parsing Model_DB...")
    model_df = pd.read_excel(EXCEL_PATH, sheet_name="Model_DB")
    blocks = parse_model_db(model_df)
    print(f"   {len(blocks)} models parsed")
    row_counts["raw"]["Model_DB"] = len(model_df)

    # ── 5. Save JSON files ──
    print("\n[5/6] Saving normalized JSON...")

    # options.json
    with open(NORMALIZED_DIR / "options.json", "w", encoding="utf-8") as f:
        json.dump({"options": all_options, "count": len(all_options)}, f, ensure_ascii=False, indent=2)
    print(f"   options.json ({len(all_options)} options)")
    row_counts["normalized"]["options"] = len(all_options)

    # fields.json
    with open(NORMALIZED_DIR / "fields.json", "w", encoding="utf-8") as f:
        json.dump({"fields": fields, "count": len(fields)}, f, ensure_ascii=False, indent=2)
    print(f"   fields.json ({len(fields)} fields)")
    row_counts["normalized"]["fields"] = len(fields)

    # groups.json (NEW)
    groups_out = {
        "groups": groups,
        "count": len(groups),
        "nav_sections": CATEGORY_NAV_SECTIONS,
    }
    with open(NORMALIZED_DIR / "groups.json", "w", encoding="utf-8") as f:
        json.dump(groups_out, f, ensure_ascii=False, indent=2)
    print(f"   groups.json ({len(groups)} groups, {len(CATEGORY_NAV_SECTIONS)} nav sections)")
    row_counts["normalized"]["groups"] = len(groups)

    # blocks.json (from Model_DB sheet)
    with open(NORMALIZED_DIR / "blocks.json", "w", encoding="utf-8") as f:
        json.dump({"blocks": blocks, "count": len(blocks)}, f, ensure_ascii=False, indent=2)
    print(f"   blocks.json ({len(blocks)} models)")
    row_counts["normalized"]["blocks"] = len(blocks)

    # meta.json
    meta = create_meta()
    with open(NORMALIZED_DIR / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print("   meta.json")

    # params.json (empty for now — params are model-specific)
    params = []
    with open(NORMALIZED_DIR / "params.json", "w", encoding="utf-8") as f:
        json.dump({"params": params, "count": 0}, f, ensure_ascii=False, indent=2)
    print("   params.json")

    # row_counts.json
    with open(NORMALIZED_DIR / "row_counts.json", "w", encoding="utf-8") as f:
        json.dump(row_counts, f, ensure_ascii=False, indent=2)
    print("   row_counts.json")

    # ── 6. Validation ──
    print("\n[6/6] Validation...")

    errors = 0
    warnings = 0

    # Check orphan groups
    option_categories = {opt["category_name"] for opt in all_options}
    group_categories = {g["category"] for g in groups}
    orphan_in_options = option_categories - group_categories
    if orphan_in_options:
        print(f"   ⚠ Categories in Token_DB but not in Group_DB: {orphan_in_options}")
        warnings += len(orphan_in_options)

    # Check empty labels
    empty_labels = [o for o in all_options if not o.get("label_en")]
    if empty_labels:
        print(f"   ⚠ Options with empty label_en: {len(empty_labels)}")
        warnings += len(empty_labels)

    # Check duplicates
    seen = set()
    dupes = 0
    for opt in all_options:
        key = f"{opt['category_id']}:{opt['value']}"
        if key in seen:
            dupes += 1
        seen.add(key)
    if dupes:
        print(f"   ⚠ Duplicate values in same category: {dupes}")
        warnings += dupes

    print(f"\n   Errors: {errors}, Warnings: {warnings}")

    # Summary
    print("\n" + "=" * 60)
    print("Conversion Complete!")
    print("=" * 60)
    print(f"   Options: {len(all_options)}")
    print(f"   Fields:  {len(fields)}")
    print(f"   Groups:  {len(groups)}")
    print(f"   Models:  {len(blocks)}")
    print("\nRun 'npm run dev' to start the app!")


if __name__ == "__main__":
    main()
