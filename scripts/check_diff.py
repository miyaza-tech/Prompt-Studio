#!/usr/bin/env python3
"""Check difference between Token_Input and Token_DB sheets."""
import openpyxl

wb = openpyxl.load_workbook('data/prompt_master_v2.xlsx', data_only=True)

# Token_Input: get all items
ws = wb['Token_Input']
input_items = []
for row in range(2, ws.max_row + 1):
    cat = ws.cell(row, 3).value  # category
    group = ws.cell(row, 4).value  # group
    name = ws.cell(row, 5).value  # name
    desc = ws.cell(row, 6).value  # description
    token_val = ws.cell(row, 7).value  # token_value
    display_label = ws.cell(row, 8).value  # display_label
    if cat and str(cat).strip():
        input_items.append({
            'row': row,
            'category': str(cat).strip(),
            'group': str(group).strip() if group else '',
            'name': str(name).strip() if name else '',
            'description': str(desc).strip() if desc else '',
            'token_value': str(token_val).strip() if token_val else '',
            'display_label': str(display_label).strip() if display_label else '',
        })

# Token_DB: get all items
ws2 = wb['Token_DB']
db_items = []
for row in range(2, ws2.max_row + 1):
    tid = ws2.cell(row, 1).value  # token_id
    cat = ws2.cell(row, 3).value  # category
    token_val = ws2.cell(row, 10).value  # token_value
    source = ws2.cell(row, 13).value  # source_sheet
    if tid and str(tid).strip():
        db_items.append({
            'row': row,
            'token_id': str(tid).strip(),
            'category': str(cat).strip() if cat else '',
            'token_value': str(token_val).strip() if token_val else '',
            'source': str(source).strip() if source else '',
        })

print('=== Token_Input categories ===')
cats_input = {}
for item in input_items:
    c = item['category']
    cats_input.setdefault(c, []).append(item)
total_input = 0
for cat in sorted(cats_input.keys()):
    items = cats_input[cat]
    print(f'  {cat}: {len(items)} items')
    total_input += len(items)
print(f'Total: {total_input}')

print('\n=== Token_DB categories ===')
cats_db = {}
for item in db_items:
    c = item['category']
    cats_db.setdefault(c, []).append(item)
total_db = 0
for cat in sorted(cats_db.keys()):
    items = cats_db[cat]
    sources = set(i['source'] for i in items)
    print(f'  {cat}: {len(items)} items (sources: {sources})')
    total_db += len(items)
print(f'Total: {total_db}')

# Find Token_Input items NOT in Token_DB (by token_value per category)
print('\n=== Token_Input items NOT in Token_DB ===')
db_values_by_cat = {}
for cat, items in cats_db.items():
    db_values_by_cat[cat] = set(i['token_value'].lower() for i in items)

missing = []
for item in input_items:
    cat = item['category']
    tv = item['token_value'].lower()
    db_vals = db_values_by_cat.get(cat, set())
    if tv and tv not in db_vals:
        missing.append(item)

for m in missing:
    print(f"  [{m['category']}] {m['name']} -> token_value: {m['token_value']}")
print(f'\nTotal missing from Token_DB: {len(missing)}')

# Also check: Token_DB items from '체크박스' source that have no Token_Input match
print('\n=== Token_DB items NOT in Token_Input (체크박스 source) ===')
input_values_by_cat = {}
for item in input_items:
    cat = item['category']
    input_values_by_cat.setdefault(cat, set()).add(item['token_value'].lower())

extra = []
for item in db_items:
    cat = item['category']
    tv = item['token_value'].lower()
    input_vals = input_values_by_cat.get(cat, set())
    if tv and tv not in input_vals:
        extra.append(item)

for e in extra[:20]:
    print(f"  [{e['category']}] {e['token_value'][:60]} (source: {e['source']})")
if len(extra) > 20:
    print(f'  ... and {len(extra) - 20} more')
print(f'\nTotal in Token_DB only: {len(extra)}')
