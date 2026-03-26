#!/usr/bin/env python3
"""Check Token_DB ID patterns and Group_DB structure."""
import openpyxl

wb = openpyxl.load_workbook('data/prompt_master_v2.xlsx', data_only=True)
ws = wb['Token_DB']

# Check token_id pattern and category_key mapping
print('=== Token_DB ID patterns (first 3 per category) ===')
cats = {}
for row in range(2, ws.max_row + 1):
    tid = ws.cell(row, 1).value
    cat = ws.cell(row, 3).value
    cat_key = ws.cell(row, 4).value
    group = ws.cell(row, 5).value
    group_key = ws.cell(row, 6).value
    token_key = ws.cell(row, 16).value
    short = ws.cell(row, 7).value
    label = ws.cell(row, 8).value
    disp = ws.cell(row, 9).value
    tval = ws.cell(row, 10).value
    desc = ws.cell(row, 11).value
    raw = ws.cell(row, 12).value
    if cat:
        cat = str(cat).strip()
        if cat not in cats:
            cats[cat] = []
        if len(cats[cat]) < 2:
            cats[cat].append({
                'tid': str(tid) if tid else '',
                'cat_key': str(cat_key) if cat_key else '',
                'group': str(group) if group else '',
                'group_key': str(group_key) if group_key else '',
                'token_key': str(token_key) if token_key else '',
                'short': str(short) if short else '',
                'label': str(label) if label else '',
                'disp': str(disp) if disp else '',
                'tval': str(tval)[:60] if tval else '',
                'desc': str(desc)[:60] if desc else '',
                'raw': str(raw)[:60] if raw else '',
            })

for cat, items in cats.items():
    print(f'\n{cat}:')
    for i in items:
        print(f"  tid={i['tid']}")
        print(f"  cat_key={i['cat_key']} group={i['group']} group_key={i['group_key']}")
        print(f"  token_key={i['token_key']} short={i['short']}")
        print(f"  label={i['label'][:50]}")
        print(f"  disp={i['disp'][:50]}")
        print(f"  tval={i['tval'][:50]}")
        print(f"  desc={i['desc'][:50]}")
        print(f"  raw={i['raw'][:50]}")
        print()

# Check Group_DB
print('\n=== Group_DB ===')
ws3 = wb['Group_DB']
print(f'Rows: {ws3.max_row}, Cols: {ws3.max_column}')
print('Headers:')
for col in range(1, ws3.max_column + 1):
    print(f'  Col {col}: {ws3.cell(1, col).value}')

# Check if 스타일 계열 exists in Group_DB
print('\n=== Group_DB categories ===')
gdb_cats = set()
for row in range(2, ws3.max_row + 1):
    cat = ws3.cell(row, 1).value
    if cat:
        gdb_cats.add(str(cat).strip())
for c in sorted(gdb_cats):
    print(f'  {c}')

# Check Token_Input group values for missing items
print('\n=== Token_Input missing items details ===')
ws_in = wb['Token_Input']
for row in range(2, ws_in.max_row + 1):
    cat = str(ws_in.cell(row, 3).value or '').strip()
    group = str(ws_in.cell(row, 4).value or '').strip()
    name = str(ws_in.cell(row, 5).value or '').strip()
    desc = str(ws_in.cell(row, 6).value or '').strip()
    tval = str(ws_in.cell(row, 7).value or '').strip()
    disp = str(ws_in.cell(row, 8).value or '').strip()
    if cat in ('스타일 계열',):
        print(f"  Row {row}: cat={cat} group={group} name={name} tval={tval} disp={disp} desc={desc[:50]}")
