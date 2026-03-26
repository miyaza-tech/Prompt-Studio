#!/usr/bin/env python3
"""
sync_token_input_to_db.py
=========================
Token_Input 시트의 항목을 Token_DB 시트에 동기화합니다.
- Token_DB에 이미 있는 항목은 그대로 유지
- Token_Input에만 있는 항목을 Token_DB 끝에 추가
- 새 카테고리(예: 스타일 계열)도 자동 처리

매칭 기준: (category, token_value) 쌍이 동일하면 이미 존재하는 것으로 간주

Usage:
    python scripts/sync_token_input_to_db.py
    python scripts/sync_token_input_to_db.py --dry-run   # 미리보기만
"""

import openpyxl
import re
import zlib
import sys
from copy import copy
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / "data" / "prompt_master_v2.xlsx"
BACKUP_SUFFIX = ".backup"


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def clean(val) -> str:
    """Clean cell value to string."""
    if val is None:
        return ""
    return str(val).strip()


def generate_category_key(category_name: str) -> str:
    """Generate category_key using CRC32 (same as original v1 script)."""
    crc = zlib.crc32(category_name.encode("utf-8")) & 0xFFFFFFFF
    return f"cat_{crc:08x}"


def generate_token_key(token_value: str) -> str:
    """Generate token_key from token_value (lowercase, underscore-separated)."""
    if not token_value:
        return ""
    # Remove special chars except alphanumeric, Korean, spaces, hyphens, underscores
    cleaned = re.sub(r'[^a-zA-Z0-9\s_-]', '', token_value)
    # Replace spaces/hyphens with underscores, lowercase
    cleaned = re.sub(r'[\s-]+', '_', cleaned.lower()).strip('_')
    return cleaned[:80]


def generate_token_id(category_key: str, group_key: str, token_key: str, existing_ids: set) -> str:
    """Generate a unique token_id in format: {category_key}__{group_key}__{token_key}"""
    base_id = f"{category_key}__{group_key}__{token_key}"
    if base_id not in existing_ids:
        return base_id
    # Append __n2, __n3, etc. for duplicates
    for n in range(2, 1000):
        candidate = f"{base_id}__n{n}"
        if candidate not in existing_ids:
            return candidate
    raise ValueError(f"Cannot generate unique ID for {base_id}")


def map_group_to_group_key(group_name: str) -> str:
    """Map Token_Input group column to Token_DB group_key."""
    # Most groups use "default" as group_key
    return "default"


def map_group_to_db_group(category: str, group_name: str, existing_groups: dict) -> str:
    """
    Map Token_Input (category, group) to Token_DB group name.
    Uses existing Token_DB entries first; falls back to "{category}_{group}" or "{category}_default".
    """
    # Check if this category already has a group pattern in Token_DB
    if category in existing_groups:
        cat_groups = existing_groups[category]
        # If there's only one group, use it
        if len(cat_groups) == 1:
            return list(cat_groups.keys())[0]
        # Try to match by group name
        if group_name in cat_groups:
            return group_name
        # Check if {category}_default exists
        default_group = f"{category}_default"
        if default_group in cat_groups:
            return default_group
        # Just return first group
        return list(cat_groups.keys())[0]

    # New category — create default group name
    if group_name:
        return group_name
    return f"{category}_default"


# ─────────────────────────────────────────────
# Main sync logic
# ─────────────────────────────────────────────

def main():
    dry_run = "--dry-run" in sys.argv

    if not EXCEL_PATH.exists():
        print(f"ERROR: Excel file not found: {EXCEL_PATH}")
        sys.exit(1)

    print("=" * 60)
    print("Token_Input → Token_DB Sync")
    print("=" * 60)
    if dry_run:
        print("  ** DRY RUN MODE — no changes will be saved **\n")

    # Load workbook (with formulas preserved)
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws_input = wb["Token_Input"]
    ws_db = wb["Token_DB"]

    # ── 1. Read Token_DB existing data ──
    print("[1/4] Reading Token_DB...")
    db_headers = [ws_db.cell(1, c).value for c in range(1, ws_db.max_column + 1)]
    print(f"   Headers: {db_headers}")

    existing_ids = set()
    existing_by_cat_val = {}  # (category, token_value_lower) -> row
    category_keys = {}  # category_name -> category_key
    category_groups = {}  # category_name -> {group_name -> group_key}

    for row in range(2, ws_db.max_row + 1):
        tid = clean(ws_db.cell(row, 1).value)
        cat = clean(ws_db.cell(row, 3).value)
        cat_key = clean(ws_db.cell(row, 4).value)
        group = clean(ws_db.cell(row, 5).value)
        group_key = clean(ws_db.cell(row, 6).value)
        tval = clean(ws_db.cell(row, 10).value)

        if tid:
            existing_ids.add(tid)
        if cat and tval:
            key = (cat, tval.lower())
            existing_by_cat_val[key] = row
        if cat and cat_key:
            category_keys[cat] = cat_key
        if cat and group:
            category_groups.setdefault(cat, {})[group] = group_key or "default"

    print(f"   {len(existing_ids)} existing tokens in Token_DB")
    print(f"   {len(category_keys)} categories: {list(category_keys.keys())}")

    # ── 2. Read Token_Input ──
    print("\n[2/4] Reading Token_Input...")
    input_items = []
    for row in range(2, ws_input.max_row + 1):
        cat = clean(ws_input.cell(row, 3).value)
        group = clean(ws_input.cell(row, 4).value)
        name = clean(ws_input.cell(row, 5).value)
        desc = clean(ws_input.cell(row, 6).value)
        tval = clean(ws_input.cell(row, 7).value)
        disp = clean(ws_input.cell(row, 8).value)

        if not cat or not tval:
            continue

        input_items.append({
            "row": row,
            "category": cat,
            "group": group,
            "name": name,
            "description": desc,
            "token_value": tval,
            "display_label": disp,
        })

    print(f"   {len(input_items)} items in Token_Input")

    # ── 3. Find missing items ──
    print("\n[3/4] Finding items to add...")
    to_add = []
    for item in input_items:
        key = (item["category"], item["token_value"].lower())
        if key not in existing_by_cat_val:
            to_add.append(item)

    if not to_add:
        print("   ✅ Token_DB is already in sync! No new items to add.")
        return

    print(f"   Found {len(to_add)} new items to add:")
    per_cat = {}
    for item in to_add:
        per_cat.setdefault(item["category"], []).append(item)
    for cat, items in per_cat.items():
        print(f"     [{cat}] {len(items)} items:")
        for it in items:
            print(f"       - {it['token_value'][:60]}")

    # ── 4. Generate Token_DB rows and append ──
    print(f"\n[4/4] {'Preview' if dry_run else 'Appending'} {len(to_add)} rows to Token_DB...")

    next_row = ws_db.max_row + 1
    added = 0

    for item in to_add:
        cat = item["category"]
        tval = item["token_value"]
        disp = item["display_label"] or tval
        desc = item["description"]
        group_input = item["group"]

        # Resolve category_key
        if cat in category_keys:
            cat_key = category_keys[cat]
        else:
            cat_key = generate_category_key(cat)
            category_keys[cat] = cat_key
            print(f"   ★ New category: {cat} → {cat_key}")

        # Resolve group
        db_group = map_group_to_db_group(cat, group_input, category_groups)
        grp_key = category_groups.get(cat, {}).get(db_group, "default")

        # Generate token_key
        tk = generate_token_key(tval)

        # Generate unique token_id
        tid = generate_token_id(cat_key, grp_key, tk, existing_ids)
        existing_ids.add(tid)

        # Generate old-style token_id for token_id_old column
        cat_norm = re.sub(r'[^a-zA-Z0-9\uac00-\ud7a3]', '_', cat).strip('_')
        count_in_cat = sum(1 for x in existing_ids if x.startswith(cat_key))
        tid_old = f"{cat_norm}_{count_in_cat:04d}"

        # Extract short label (English part)
        short_label = tval  # Token_Input items typically use English token_value

        # Build Token_DB row:
        # Col 1:  token_id
        # Col 2:  token_id_old
        # Col 3:  category
        # Col 4:  category_key
        # Col 5:  group
        # Col 6:  group_key
        # Col 7:  token_label_short
        # Col 8:  token_label
        # Col 9:  display_label
        # Col 10: token_value
        # Col 11: description
        # Col 12: raw
        # Col 13: source_sheet
        # Col 14: source_row
        # Col 15: source_col
        # Col 16: token_key
        row_data = [
            tid,              # 1: token_id
            tid_old,          # 2: token_id_old
            cat,              # 3: category
            cat_key,          # 4: category_key
            db_group,         # 5: group
            grp_key,          # 6: group_key
            short_label,      # 7: token_label_short
            disp,             # 8: token_label
            disp,             # 9: display_label
            tval,             # 10: token_value
            desc,             # 11: description
            disp,             # 12: raw
            "Token_Input",    # 13: source_sheet
            item["row"],      # 14: source_row
            "",               # 15: source_col
            tk,               # 16: token_key
        ]

        if dry_run:
            print(f"   + [{cat}] {tid}")
            print(f"     group={db_group} token_value={tval[:50]}")
        else:
            for col_idx, val in enumerate(row_data, start=1):
                ws_db.cell(next_row, col_idx, val)
            next_row += 1

        added += 1

        # Update tracking
        existing_by_cat_val[(cat, tval.lower())] = next_row - 1
        category_groups.setdefault(cat, {})[db_group] = grp_key

    if not dry_run:
        # Backup original
        backup_path = EXCEL_PATH.with_suffix(EXCEL_PATH.suffix + BACKUP_SUFFIX)
        import shutil
        shutil.copy2(EXCEL_PATH, backup_path)
        print(f"\n   Backup saved: {backup_path.name}")

        # Save updated workbook
        wb.save(EXCEL_PATH)
        print(f"   Excel saved: {EXCEL_PATH.name}")

    print(f"\n{'=' * 60}")
    print(f"{'[DRY RUN] ' if dry_run else ''}Sync complete!")
    print(f"   Added: {added} new rows to Token_DB")
    print(f"   Token_DB total: {len(existing_ids)} tokens")

    if not dry_run:
        print(f"\n   Next steps:")
        print(f"   1. Open Excel and verify Token_DB")
        print(f"   2. If '스타일 계열' was added, also add it to Group_DB sheet")
        print(f"   3. Run: npm run convert:data")
        print(f"   4. Check /debug page")

    # Report new categories that need Group_DB entries
    new_cats = set(item["category"] for item in to_add) - set(category_groups.keys() - {item["category"] for item in to_add})
    original_db_cats = set()
    for row in range(2, ws_db.max_row - added + 1):
        c = clean(ws_db.cell(row, 3).value)
        if c:
            original_db_cats.add(c)
    truly_new = set(item["category"] for item in to_add) - original_db_cats
    if truly_new:
        print(f"\n   ⚠ New categories NOT in Group_DB: {truly_new}")
        print(f"   → Please add rows for these in Group_DB sheet!")


if __name__ == "__main__":
    main()
