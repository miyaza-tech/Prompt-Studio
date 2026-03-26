"""옵션 및 추천 규칙 품질 분석"""
import json, re
from collections import Counter, defaultdict

with open('src/data/normalized/options.json','r',encoding='utf-8') as f:
    opts = json.load(f)['options']

with open('src/data/normalized/suggestions.json','r',encoding='utf-8') as f:
    sug_data = json.load(f)
    rules = sug_data['rules']

with open('src/data/normalized/fields.json','r',encoding='utf-8') as f:
    fields = json.load(f)['fields']

print("=" * 70)
print("  옵션 & 추천 규칙 품질 분석 (AI 프롬프트 관점)")
print("=" * 70)

# 1. Category overview
print('\n[1] 카테고리별 옵션 수')
cat_count = Counter()
for o in opts:
    cat_count[o['category_name']] += 1
for cat, cnt in cat_count.most_common():
    print('  %s: %d' % (cat, cnt))
print('  총합: %d' % sum(cat_count.values()))

# 2. Value quality issues
print('\n[2] value 품질 이슈 (AI가 해석하기 어려운 것)')
issues = []
for o in opts:
    v = o['value']
    cat = o['category_name']
    # Too long
    if len(v) > 50:
        issues.append(('TOO_LONG(%d자)' % len(v), cat, v))
    # Korean in value
    if re.search(r'[\uac00-\ud7af]', v):
        issues.append(('KOREAN_IN_VALUE', cat, v))
    # Very vague
    if len(v.split()) == 1 and len(v) < 5 and cat != '상단탭 B':
        issues.append(('VAGUE_SHORT', cat, v))
    # Sentence-like (starts with A/An/The or has "of the")
    if v.startswith(('A ', 'An ', 'The ')) and len(v) > 40:
        issues.append(('SENTENCE_LIKE', cat, v))

print('  총 이슈: %d' % len(issues))
for itype, cat, val in sorted(issues, key=lambda x: x[0]):
    print('  [%s] %s: %s' % (itype, cat, val[:80]))

# 3. Duplicates
print('\n[3] 중복/유사 옵션 (같은 카테고리 내)')
by_cat = defaultdict(list)
for o in opts:
    by_cat[o['category_name']].append(o)

dup_count = 0
sim_count = 0
for cat, cat_opts in by_cat.items():
    vals = [o['value'].lower().strip() for o in cat_opts]
    seen = {}
    for i, v in enumerate(vals):
        if v in seen:
            orig = cat_opts[seen[v]]['value']
            dup = cat_opts[i]['value']
            print('  [EXACT_DUP] %s: [%s] vs [%s]' % (cat, orig, dup))
            dup_count += 1
        seen[v] = i
    for i in range(len(vals)):
        for j in range(i+1, len(vals)):
            if vals[i] != vals[j] and (vals[i] in vals[j] or vals[j] in vals[i]):
                if len(vals[i]) > 4 and len(vals[j]) > 4:
                    a = cat_opts[i]['value']
                    b = cat_opts[j]['value']
                    print('  [SIMILAR] %s: [%s] ~ [%s]' % (cat, a, b))
                    sim_count += 1
print('  정확 중복: %d, 유사: %d' % (dup_count, sim_count))

# 4. Suggestion rules analysis
print('\n[4] 추천 규칙 분석')
print('  총 규칙 수: %d' % len(rules))

# Check for broken references (suggest token_values that don't exist)
opt_lookup = defaultdict(set)
for o in opts:
    opt_lookup[o['category_name']].add(o['value'])
    opt_lookup[o['category_name']].add(o.get('label_en', ''))

broken = []
for r in rules:
    for s in r['suggest']:
        cat = s['category']
        for tv in s['token_values']:
            if tv not in opt_lookup.get(cat, set()):
                broken.append((r['trigger']['token_value'], cat, tv))

print('  참조 깨진 추천 (존재하지 않는 옵션 참조): %d' % len(broken))
if broken:
    shown = set()
    for trigger, cat, tv in broken[:30]:
        key = (cat, tv)
        if key not in shown:
            shown.add(key)
            print('    [%s] %s -> 없음' % (cat, tv))

# 5. Suggest category coverage
print('\n[5] 추천에서 사용되는 카테고리 빈도')
suggest_cat_count = Counter()
for r in rules:
    for s in r['suggest']:
        suggest_cat_count[s['category']] += 1
for cat, cnt in suggest_cat_count.most_common():
    print('  %s: %d회' % (cat, cnt))

# 6. Categories never suggested
all_cats = set(cat_count.keys())
suggested_cats = set(suggest_cat_count.keys())
never_suggested = all_cats - suggested_cats - {'상단탭 B'}
if never_suggested:
    print('\n[6] 추천에 한 번도 등장하지 않는 카테고리:')
    for c in sorted(never_suggested):
        print('  - %s (%d옵션)' % (c, cat_count[c]))

# 7. AI prompt effectiveness
print('\n[7] AI 프롬프트 효율성 평가')
# Check if values are good for Midjourney/DALL-E/Stable Diffusion
good = 0
needs_work = 0
for o in opts:
    v = o['value']
    # Good: 2-6 words, English, descriptive
    words = v.split()
    if 1 <= len(words) <= 8 and not re.search(r'[\uac00-\ud7af]', v) and len(v) <= 50:
        good += 1
    else:
        needs_work += 1

print('  AI-friendly 옵션: %d/%d (%.1f%%)' % (good, len(opts), good/len(opts)*100))
print('  개선 필요: %d' % needs_work)
