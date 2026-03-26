"""
옵션 & 추천 규칙 품질 개선 스크립트
1. Portrait Photography 중복 제거
2. 깨진 추천 참조 수정
3. 분위기 단어형/문장형 정리
4. 카메라&렌즈 추천 추가
"""
import json, copy
from collections import defaultdict

# ── Load data ──
with open('src/data/normalized/options.json', 'r', encoding='utf-8') as f:
    opt_data = json.load(f)
    opts = opt_data['options']

with open('src/data/normalized/suggestions.json', 'r', encoding='utf-8') as f:
    sug_data = json.load(f)
    rules = sug_data['rules']

print("=" * 70)
print("  품질 개선 시작")
print("=" * 70)

# ════════════════════════════════════════════════════════════════════
# 1. Portrait Photography 중복 제거
# ════════════════════════════════════════════════════════════════════
print("\n[1] Portrait Photography 중복 제거")

# Keep first one (idx=0), remove idx=18 and idx=478
remove_ids = {
    'cat_7e0c0a64__default__portrait_photography__n2',
    'cat_7e0c0a64__default__portrait_photography__n3',
}
before = len(opts)
opts = [o for o in opts if o['option_id'] not in remove_ids]
removed = before - len(opts)
print("  제거: %d개 (남은 옵션: %d)" % (removed, len(opts)))

# Remove duplicate suggestion rule too
before_rules = len(rules)
rules = [r for r in rules if r['id'] != 'portrait_photography']
print("  중복 추천 규칙 제거: %d개" % (before_rules - len(rules)))

# ════════════════════════════════════════════════════════════════════
# 2. 깨진 추천 참조 수정 (존재하지 않는 옵션 제거)
# ════════════════════════════════════════════════════════════════════
print("\n[2] 깨진 추천 참조 수정")

# Build lookup of existing options by category
opt_lookup = defaultdict(set)
for o in opts:
    opt_lookup[o['category_name']].add(o['value'])
    if o.get('label_en'):
        opt_lookup[o['category_name']].add(o['label_en'])

broken_count = 0
fixed_rules = 0
for r in rules:
    for s in r['suggest']:
        cat = s['category']
        existing = opt_lookup.get(cat, set())
        valid = [tv for tv in s['token_values'] if tv in existing]
        removed_tvs = [tv for tv in s['token_values'] if tv not in existing]
        if removed_tvs:
            broken_count += len(removed_tvs)
            fixed_rules += 1
        s['token_values'] = valid

# Remove suggest items with empty token_values
for r in rules:
    r['suggest'] = [s for s in r['suggest'] if len(s['token_values']) > 0]

# Remove rules with no suggests left
before_r = len(rules)
rules = [r for r in rules if len(r['suggest']) > 0]
empty_removed = before_r - len(rules)

print("  깨진 참조 제거: %d건" % broken_count)
print("  빈 규칙 제거: %d개" % empty_removed)
print("  남은 규칙: %d개" % len(rules))

# ════════════════════════════════════════════════════════════════════
# 3. 분위기 단어형/문장형 정리
# ════════════════════════════════════════════════════════════════════
print("\n[3] 분위기 단어형/문장형 정리")

# 문장형 → 단어형 매핑 (문장형을 단어형으로 통합)
mood_merge = {
    'dark moody atmosphere': 'Moody',
    'dreamy soft atmosphere': 'Dreamy',
    'ethereal dreamy atmosphere': 'Ethereal',
    'intense dramatic atmosphere': 'Dramatic',
    'nostalgic sentimental atmosphere': 'Nostalgic',
    'melancholic emotional atmosphere': 'Melancholic',
    'mysterious suspenseful atmosphere': 'Mysterious',
    'vibrant colorful atmosphere': 'Colorful',
    'bright airy atmosphere': 'Bright',
    'epic grand atmosphere': 'Epic',
}

# Remove the sentence-form options
remove_mood_values = set(mood_merge.keys())
mood_removed = 0
new_opts = []
for o in opts:
    if o['category_name'] == '분위기' and o['value'] in remove_mood_values:
        mood_removed += 1
    else:
        new_opts.append(o)
opts = new_opts
print("  문장형 분위기 옵션 제거: %d개" % mood_removed)

# Update suggestion rules: replace sentence-form with word-form
merge_count = 0
for r in rules:
    for s in r['suggest']:
        if s['category'] == '분위기':
            new_tvs = []
            for tv in s['token_values']:
                if tv in mood_merge:
                    replacement = mood_merge[tv]
                    if replacement not in new_tvs:
                        new_tvs.append(replacement)
                        merge_count += 1
                else:
                    if tv not in new_tvs:
                        new_tvs.append(tv)
            s['token_values'] = new_tvs
print("  추천 규칙 내 문장형→단어형 변환: %d건" % merge_count)
print("  남은 분위기 옵션: %d개" % len([o for o in opts if o['category_name'] == '분위기']))

# ════════════════════════════════════════════════════════════════════
# 4. 카메라&렌즈를 추천에 포함
# ════════════════════════════════════════════════════════════════════
print("\n[4] 카메라&렌즈 추천 추가")

# Map genre triggers to recommended camera+lens combos
camera_opts = [o for o in opts if o['category_name'] == '카메라&렌즈']
camera_values = {o['value'] for o in camera_opts}

# Build genre → camera mapping based on subject matter
camera_suggest_map = {
    # Portrait
    'Portrait Photography': {
        'token_values': ['Sony A7R V + 85mm f/1.4 GM', 'Canon EOS R5 + RF 85mm f/1.2L', 'Nikon Z9 + 85mm f/1.2 S'],
        'reason': '인물 촬영 최적 카메라+렌즈 조합'
    },
    # Landscape 
    'Landscape Photography': {
        'token_values': ['Nikon Z9 + 14-24mm f/2.8 S', 'Sony A7R V + 16-35mm f/2.8 GM II'],
        'reason': '풍경 촬영용 광각 조합'
    },
    # Street
    'Street Photography': {
        'token_values': ['Fujifilm X-T5 + 23mm f/1.4', 'Leica M11 + Summilux 35mm f/1.4'],
        'reason': '스트리트 촬영 클래식 조합'
    },
    # Night
    'Night Photography': {
        'token_values': ['Sony A7S III + 24mm f/1.4 GM', 'Canon EOS R5 + RF 15-35mm f/2.8L'],
        'reason': '야간 고감도 촬영용'
    },
    # Food
    'Food Photography': {
        'token_values': ['Sony A7R V + 90mm f/2.8 Macro G', 'Canon EOS R5 + RF 85mm f/1.2L'],
        'reason': '음식 촬영 매크로/중망원'
    },
    # Product
    'Product Photography': {
        'token_values': ['Sony A7R V + 90mm f/2.8 Macro G', 'Canon EOS R5 + RF 100mm f/2.8L Macro'],
        'reason': '제품 촬영 매크로 렌즈'
    },
    # Fashion
    'Fashion Editorials': {
        'token_values': ['Canon EOS R5 + RF 85mm f/1.2L', 'Sony A7R V + 85mm f/1.4 GM'],
        'reason': '패션 촬영 인물 렌즈'
    },
    'fashion editorial photography': {
        'token_values': ['Canon EOS R5 + RF 85mm f/1.2L', 'Sony A7R V + 85mm f/1.4 GM'],
        'reason': '패션 촬영 인물 렌즈'
    },
    # Macro
    'Macro Photography': {
        'token_values': ['Sony A7R V + 90mm f/2.8 Macro G', 'Canon EOS R5 + RF 100mm f/2.8L Macro'],
        'reason': '접사 촬영 매크로 전용'
    },
    # Sports
    'Sports/Action Photography': {
        'token_values': ['Nikon Z9 + 70-200mm f/2.8 S', 'Sony A1 + 70-200mm f/2.8 GM II'],
        'reason': '스포츠 고속 연사 + 망원'
    },
    # Documentary
    'Documentary Photography': {
        'token_values': ['Leica M11 + Summilux 35mm f/1.4', 'Fujifilm X-T5 + 23mm f/1.4'],
        'reason': '다큐멘터리 스냅 촬영'
    },
    # Architecture
    'Architectural Photography': {
        'token_values': ['Nikon Z9 + 14-24mm f/2.8 S', 'Sony A7R V + 16-35mm f/2.8 GM II'],
        'reason': '건축 촬영 광각'
    },
    # Aerial
    'Aerial Photography': {
        'token_values': ['DJI Mavic 3 Pro (Hasselblad)'],
        'reason': '항공 촬영 드론'
    },
    # Underwater
    'Underwater Photography': {
        'token_values': ['Sony A7R V + 16-35mm f/2.8 GM II'],
        'reason': '수중 광각 촬영'
    },
    # Milky Way
    'Milky Way/Star Photography': {
        'token_values': ['Sony A7S III + 24mm f/1.4 GM', 'Nikon Z9 + 14-24mm f/2.8 S'],
        'reason': '천체 촬영 고감도 + 광각'
    },
    # Wildlife
    'Birds/Wildlife': {
        'token_values': ['Sony A1 + 70-200mm f/2.8 GM II', 'Nikon Z9 + 70-200mm f/2.8 S'],
        'reason': '야생동물 망원 촬영'
    },
    # Cinematic
    'cinematic film still': {
        'token_values': ['Sony A7S III + 24mm f/1.4 GM', 'Canon EOS R5 + RF 85mm f/1.2L'],
        'reason': '시네마틱 영상/스틸'
    },
    'commercial film frame': {
        'token_values': ['Canon EOS R5 + RF 85mm f/1.2L', 'Sony A7R V + 85mm f/1.4 GM'],
        'reason': '상업 영상 촬영'
    },
    'photorealistic': {
        'token_values': ['Sony A7R V + 85mm f/1.4 GM', 'Canon EOS R5 + RF 85mm f/1.2L'],
        'reason': '포토리얼 시뮬레이션 카메라'
    },
    'portrait photography': {  # lowercase variant was merged but keep for safety
        'token_values': ['Sony A7R V + 85mm f/1.4 GM'],
        'reason': '인물 촬영 카메라'
    },
}

# Validate and add camera suggestions to existing rules
added_camera = 0
for r in rules:
    trigger_val = r['trigger']['token_value']
    if trigger_val in camera_suggest_map:
        mapping = camera_suggest_map[trigger_val]
        # Filter to only existing camera options
        valid_tvs = [tv for tv in mapping['token_values'] if tv in camera_values]
        if valid_tvs:
            # Check if already has camera suggestion
            has_camera = any(s['category'] == '카메라&렌즈' for s in r['suggest'])
            if not has_camera:
                r['suggest'].append({
                    'category': '카메라&렌즈',
                    'token_values': valid_tvs,
                    'reason': mapping['reason']
                })
                added_camera += 1

print("  카메라&렌즈 추천 추가: %d개 규칙에 적용" % added_camera)

# ── Rebuild opt_lookup after changes for final validation ──
opt_lookup2 = defaultdict(set)
for o in opts:
    opt_lookup2[o['category_name']].add(o['value'])
    if o.get('label_en'):
        opt_lookup2[o['category_name']].add(o['label_en'])

# Final broken reference check
final_broken = 0
for r in rules:
    for s in r['suggest']:
        cat = s['category']
        existing = opt_lookup2.get(cat, set())
        for tv in s['token_values']:
            if tv not in existing:
                final_broken += 1

# ── Save ──
opt_data['options'] = opts
sug_data['rules'] = rules

with open('src/data/normalized/options.json', 'w', encoding='utf-8') as f:
    json.dump(opt_data, f, ensure_ascii=False, indent=2)

with open('src/data/normalized/suggestions.json', 'w', encoding='utf-8') as f:
    json.dump(sug_data, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 70)
print("  완료 요약")
print("=" * 70)
print("  옵션: %d개" % len(opts))
print("  추천 규칙: %d개" % len(rules))
print("  남은 깨진 참조: %d건" % final_broken)
