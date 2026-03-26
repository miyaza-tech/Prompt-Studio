"""
저자(배네, 박민지)의 시그니처 프롬프트 키워드 추가 스크립트

1순위: 피부 리얼리즘 (Skin Realism) - 품질 & 디테일 카테고리에 7개 옵션
2순위: 카메라 조합 2개 - 카메라&렌즈 카테고리
3순위: 조명 키워드 3개 - 조명 카테고리
"""

import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NORM = os.path.join(BASE, "src", "data", "normalized")

def load_json(name):
    with open(os.path.join(NORM, name), "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(name, data):
    with open(os.path.join(NORM, name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("  >> Saved %s" % name)


def make_option(category_id, category_name, group, value, label_ko, sort_order, token_key, description=""):
    """표준 옵션 객체 생성"""
    return {
        "option_id": "%s__default__%s" % (category_id, token_key),
        "category_id": category_id,
        "category_name": category_name,
        "category_name_raw": category_name,
        "group": group,
        "group_key": "default",
        "value": value,
        "value_raw": value,
        "label": value,
        "label_raw": value,
        "label_en": value,
        "label_ko": label_ko,
        "description": description,
        "sort_order": sort_order,
        "default_generated": False,
        "media_type": "all",
        "image_url": "",
        "token_key": token_key
    }


def add_skin_realism(options_data, groups_data):
    """1순위: 피부 리얼리즘 옵션 7개 추가"""
    CAT_ID = "cat_f0183f05"  # 품질 & 디테일
    CAT_NAME = "품질 & 디테일"
    GROUP = "Skin Realism"

    new_options = [
        ("Visible Pores",           "모공이 보이는",              "visible_pores",           18),
        ("Natural Skin Oils",       "자연스러운 피부 유분",       "natural_skin_oils",       19),
        ("Fine Facial Hair",        "얼굴의 미세 솜털",           "fine_facial_hair",        20),
        ("Unretouched",             "보정하지 않은 날것",         "unretouched",             21),
        ("Raw Authentic Beauty",    "날것의 진정한 아름다움",     "raw_authentic_beauty",    22),
        ("Detailed Skin Texture",   "디테일한 피부 질감",         "detailed_skin_texture",   23),
        ("Raw Beauty Documentation","날것의 아름다움 기록",       "raw_beauty_documentation",24),
    ]

    existing_ids = {o["option_id"] for o in options_data["options"]}
    added = 0

    for value, label_ko, token_key, sort_order in new_options:
        opt = make_option(CAT_ID, CAT_NAME, GROUP, value, label_ko, sort_order, token_key)
        if opt["option_id"] not in existing_ids:
            options_data["options"].append(opt)
            added += 1
            print("  + [Skin Realism] %s (%s)" % (value, label_ko))
        else:
            print("  ~ [Skin Realism] %s already exists, skip" % value)

    # groups.json에 Skin Realism 그룹 추가
    existing_groups = [(g["category"], g["group"]) for g in groups_data["groups"]]
    if (CAT_NAME, GROUP) not in existing_groups:
        max_gso = max(g["group_sort_order"] for g in groups_data["groups"])
        groups_data["groups"].append({
            "category": CAT_NAME,
            "category_key": CAT_ID,
            "group": GROUP,
            "group_key": "default",
            "group_display_name": "Skin Realism",
            "category_sort_order": 14,
            "group_sort_order": max_gso + 1,
            "selection_mode": "multi",
            "mutex_group": "",
            "output_joiner": ", "
        })
        print("  + [groups.json] Added Skin Realism group (sort: %d)" % (max_gso + 1))

    return added


def add_camera_combos(options_data):
    """2순위: 저자 시그니처 카메라 조합 2개 추가"""
    CAT_ID = "cat_e7be0e5f"  # 카메라&렌즈
    CAT_NAME = "카메라&렌즈"

    new_options = [
        # Leica M11 + 50mm Summilux f/1.4 → 인물 그룹 (저자의 "The Mechanical Eye")
        ("Leica M11 + Summilux 50mm f/1.4", "라이카 M11 + 주미룩스 50mm",
         "leica_m11_summilux_50mm_f_1_4", "인물", 52,
         "(저자 시그니처 'The Mechanical Eye' — 부드러운 보케와 날것의 아름다움)"),

        # Nikon Z9 + MC 105mm f/2.8 VR S → 매크로 그룹 (저자의 매크로 포트레이트)
        ("Nikon Z9 + MC 105mm f/2.8 VR S", "니콘 Z9 + 매크로 105mm",
         "nikon_z9_mc_105mm_f_2_8_vr_s", "매크로", 53,
         "(저자 시그니처 매크로 포트레이트 — 모공까지 담는 극사실주의)"),
    ]

    existing_ids = {o["option_id"] for o in options_data["options"]}
    added = 0

    for value, label_ko, token_key, group, sort_order, desc in new_options:
        opt = make_option(CAT_ID, CAT_NAME, group, value, label_ko, sort_order, token_key, desc)
        if opt["option_id"] not in existing_ids:
            options_data["options"].append(opt)
            added += 1
            print("  + [Camera] %s (%s)" % (value, label_ko))
        else:
            print("  ~ [Camera] %s already exists, skip" % value)

    return added


def add_lighting_keywords(options_data):
    """3순위: 저자 시그니처 조명 키워드 3개 추가"""
    CAT_ID = "cat_ecfc9e6b"  # 조명
    CAT_NAME = "조명"

    new_options = [
        # Harsh Midday Sun — 저자의 다큐멘터리/스트리트 기법
        ("Harsh Midday Sun", "한낮의 거친 태양빛",
         "harsh_midday_sun", "자연광", 74,
         "(정오의 가혹하고 강렬한 직사광. 그림자가 짧고 대비가 극대화되어 다큐멘터리적 긴장감 연출)"),

        # Late Afternoon Warmth — Golden Hour와 다른 서정적 온기
        ("Late Afternoon Warmth", "늦은 오후의 따뜻한 빛",
         "late_afternoon_warmth", "자연광", 75,
         "(골든아워 직전의 따스한 자연광. 일상의 온기와 서정적 분위기를 자연스럽게 연출)"),

        # Soft Diffused Daylight — 부드럽게 확산된 자연 주광
        ("Soft Diffused Daylight", "부드럽게 확산된 자연 주광",
         "soft_diffused_daylight", "자연광", 76,
         "(구름이나 커튼 등으로 확산된 부드러운 자연광. 피부 질감을 섬세하게 살려주는 인물 촬영 최적 조명)"),
    ]

    existing_ids = {o["option_id"] for o in options_data["options"]}
    added = 0

    for value, label_ko, token_key, group, sort_order, desc in new_options:
        opt = make_option(CAT_ID, CAT_NAME, group, value, label_ko, sort_order, token_key, desc)
        if opt["option_id"] not in existing_ids:
            options_data["options"].append(opt)
            added += 1
            print("  + [Lighting] %s (%s)" % (value, label_ko))
        else:
            print("  ~ [Lighting] %s already exists, skip" % value)

    return added


def add_suggestion_rules(suggestions_data, options_data):
    """새 옵션들에 대한 suggestion 규칙 추가
    
    suggestions.json 구조:
    {
      "rules": [
        {
          "id": "rule_id",
          "name": "규칙 이름",
          "trigger": { "category": "카테고리명", "token_value": "Value" },
          "suggest": [
            { "category": "카테고리명", "token_values": ["V1","V2"], "reason": "..." }
          ],
          "priority": 10
        }
      ]
    }
    """
    rules = suggestions_data["rules"]
    existing_ids = {r["id"] for r in rules}

    # 유효한 option value 셋 (카테고리별)
    valid_values = {}  # {category_name: set(values)}
    for o in options_data["options"]:
        cn = o["category_name"]
        if cn not in valid_values:
            valid_values[cn] = set()
        valid_values[cn].add(o["value"])

    new_rules = []

    # ── Skin Realism 각 옵션에 대한 suggestion 규칙 ──
    skin_options = [
        ("visible_pores",           "Visible Pores",           "모공이 보이는 피부 리얼리즘"),
        ("natural_skin_oils",       "Natural Skin Oils",       "자연스러운 피부 유분 표현"),
        ("fine_facial_hair",        "Fine Facial Hair",        "얼굴 미세 솜털 표현"),
        ("unretouched",             "Unretouched",             "보정 없는 날것의 촬영"),
        ("raw_authentic_beauty",    "Raw Authentic Beauty",    "날것의 진정한 아름다움"),
        ("detailed_skin_texture",   "Detailed Skin Texture",   "디테일한 피부 질감"),
        ("raw_beauty_documentation","Raw Beauty Documentation","날것의 아름다움 기록"),
    ]

    for rule_id_suffix, trigger_value, name in skin_options:
        rule_id = "skin_%s" % rule_id_suffix
        if rule_id in existing_ids:
            continue
        new_rules.append({
            "id": rule_id,
            "name": name,
            "trigger": {"category": "품질 & 디테일", "token_value": trigger_value},
            "suggest": [
                {
                    "category": "장르",
                    "token_values": ["Portrait Photography", "Documentary Photography"],
                    "reason": "피부 리얼리즘에 최적화된 장르"
                },
                {
                    "category": "샷구성",
                    "token_values": ["Extreme Close-Up", "Close-Up"],
                    "reason": "피부 디테일을 살리는 샷"
                },
                {
                    "category": "조명",
                    "token_values": ["Window Light", "Soft Diffused Daylight", "Natural Light"],
                    "reason": "피부 질감을 자연스럽게 살리는 조명"
                },
                {
                    "category": "카메라&렌즈",
                    "token_values": ["Leica M11 + Summilux 50mm f/1.4", "Nikon Z9 + MC 105mm f/2.8 VR S"],
                    "reason": "저자 시그니처 카메라 — 피부 리얼리즘 촬영"
                },
                {
                    "category": "분위기",
                    "token_values": ["Intimate", "Serene"],
                    "reason": "날것의 아름다움에 어울리는 분위기"
                }
            ],
            "priority": 8
        })

    # ── Leica M11 + Summilux 50mm f/1.4 ──
    if "leica_m11_summilux_portrait" not in existing_ids:
        new_rules.append({
            "id": "leica_m11_summilux_portrait",
            "name": "라이카 M11 주미룩스 인물 세트 (저자 시그니처)",
            "trigger": {"category": "카메라&렌즈", "token_value": "Leica M11 + Summilux 50mm f/1.4"},
            "suggest": [
                {
                    "category": "품질 & 디테일",
                    "token_values": ["Visible Pores", "Unretouched", "Raw Authentic Beauty"],
                    "reason": "저자의 'The Mechanical Eye' 시그니처 키워드"
                },
                {
                    "category": "장르",
                    "token_values": ["Portrait Photography", "Documentary Photography"],
                    "reason": "인물/다큐멘터리 촬영 최적"
                },
                {
                    "category": "샷구성",
                    "token_values": ["Close-Up", "Extreme Close-Up"],
                    "reason": "인물 클로즈업"
                },
                {
                    "category": "조명",
                    "token_values": ["Window Light", "Soft Diffused Daylight"],
                    "reason": "부드러운 자연광으로 날것의 아름다움"
                },
                {
                    "category": "분위기",
                    "token_values": ["Intimate", "Nostalgic"],
                    "reason": "라이카 감성에 어울리는 분위기"
                },
                {
                    "category": "필름 톤",
                    "token_values": ["Film Grain"],
                    "reason": "라이카의 필름 감성"
                }
            ],
            "priority": 9
        })

    # ── Nikon Z9 + MC 105mm f/2.8 ──
    if "nikon_z9_macro_portrait" not in existing_ids:
        new_rules.append({
            "id": "nikon_z9_macro_portrait",
            "name": "니콘 Z9 매크로 포트레이트 세트 (저자 시그니처)",
            "trigger": {"category": "카메라&렌즈", "token_value": "Nikon Z9 + MC 105mm f/2.8 VR S"},
            "suggest": [
                {
                    "category": "품질 & 디테일",
                    "token_values": ["Visible Pores", "Natural Skin Oils", "Detailed Skin Texture", "Fine Facial Hair"],
                    "reason": "매크로로 포착하는 극사실 피부 디테일"
                },
                {
                    "category": "장르",
                    "token_values": ["Macro Photography", "Portrait Photography"],
                    "reason": "매크로 포트레이트"
                },
                {
                    "category": "샷구성",
                    "token_values": ["Extreme Close-Up"],
                    "reason": "매크로 초근접 샷"
                },
                {
                    "category": "조명",
                    "token_values": ["Window Light", "Natural Light", "Soft Diffused Daylight"],
                    "reason": "피부 디테일을 살리는 자연광"
                },
                {
                    "category": "렌즈종류",
                    "token_values": ["Macro Lens"],
                    "reason": "매크로 렌즈 매칭"
                }
            ],
            "priority": 9
        })

    # ── Harsh Midday Sun ──
    if "harsh_midday_sun" not in existing_ids:
        new_rules.append({
            "id": "harsh_midday_sun",
            "name": "한낮의 거친 태양 — 다큐멘터리 세트",
            "trigger": {"category": "조명", "token_value": "Harsh Midday Sun"},
            "suggest": [
                {
                    "category": "장르",
                    "token_values": ["Street Photography", "Documentary Photography"],
                    "reason": "거친 직사광에 어울리는 다큐멘터리/스트리트"
                },
                {
                    "category": "품질 & 디테일",
                    "token_values": ["Visible Pores", "Natural Skin Oils", "Unretouched"],
                    "reason": "강한 빛이 드러내는 피부 리얼리즘"
                },
                {
                    "category": "분위기",
                    "token_values": ["Dramatic", "Gritty"],
                    "reason": "거친 태양의 극적 분위기"
                },
                {
                    "category": "색채",
                    "token_values": ["High Contrast", "Warm Tones"],
                    "reason": "정오 태양의 높은 대비"
                }
            ],
            "priority": 8
        })

    # ── Late Afternoon Warmth ──
    if "late_afternoon_warmth" not in existing_ids:
        new_rules.append({
            "id": "late_afternoon_warmth",
            "name": "늦은 오후의 따뜻한 빛 — 서정 세트",
            "trigger": {"category": "조명", "token_value": "Late Afternoon Warmth"},
            "suggest": [
                {
                    "category": "장르",
                    "token_values": ["Street Photography", "Portrait Photography"],
                    "reason": "따뜻한 오후 빛에 어울리는 장르"
                },
                {
                    "category": "조명",
                    "token_values": ["Golden Hour", "Window Light"],
                    "reason": "유사한 따뜻한 조명과 조합"
                },
                {
                    "category": "분위기",
                    "token_values": ["Serene", "Intimate", "Nostalgic"],
                    "reason": "늦은 오후의 서정적 분위기"
                },
                {
                    "category": "색채",
                    "token_values": ["Warm Tones"],
                    "reason": "따뜻한 색온도"
                }
            ],
            "priority": 8
        })

    # ── Soft Diffused Daylight ──
    if "soft_diffused_daylight" not in existing_ids:
        new_rules.append({
            "id": "soft_diffused_daylight",
            "name": "부드러운 확산 자연광 — 인물 세트",
            "trigger": {"category": "조명", "token_value": "Soft Diffused Daylight"},
            "suggest": [
                {
                    "category": "장르",
                    "token_values": ["Portrait Photography"],
                    "reason": "확산광에 최적화된 인물 촬영"
                },
                {
                    "category": "품질 & 디테일",
                    "token_values": ["Visible Pores", "Detailed Skin Texture", "Raw Authentic Beauty"],
                    "reason": "부드러운 빛이 살리는 피부 질감"
                },
                {
                    "category": "샷구성",
                    "token_values": ["Close-Up", "Extreme Close-Up"],
                    "reason": "확산광으로 피부 디테일 촬영"
                },
                {
                    "category": "카메라&렌즈",
                    "token_values": ["Leica M11 + Summilux 50mm f/1.4"],
                    "reason": "부드러운 빛에 어울리는 카메라"
                },
                {
                    "category": "분위기",
                    "token_values": ["Serene", "Intimate"],
                    "reason": "부드러운 자연광의 평온한 분위기"
                }
            ],
            "priority": 8
        })

    # ── 기존 규칙에 Skin Realism 추가 ──
    updated_existing = 0
    for rule in rules:
        trigger_cat = rule["trigger"]["category"]
        trigger_val = rule["trigger"]["token_value"]

        # Portrait Photography, Documentary Photography, Macro Photography 규칙에 Skin Realism 추가
        if trigger_cat == "장르" and trigger_val in ["Portrait Photography", "Documentary Photography", "Macro Photography"]:
            # 이미 품질 & 디테일 suggest가 있는지 확인
            has_quality = False
            for sg in rule["suggest"]:
                if sg["category"] == "품질 & 디테일":
                    # 기존 항목에 skin realism 추가
                    for sv in ["Visible Pores", "Unretouched", "Raw Authentic Beauty"]:
                        if sv not in sg["token_values"]:
                            sg["token_values"].append(sv)
                    has_quality = True
                    break
            if not has_quality:
                rule["suggest"].append({
                    "category": "품질 & 디테일",
                    "token_values": ["Visible Pores", "Unretouched", "Raw Authentic Beauty"],
                    "reason": "피부 리얼리즘 키워드 (저자 시그니처)"
                })
            # 새 카메라 조합도 추가
            for sg in rule["suggest"]:
                if sg["category"] == "카메라&렌즈":
                    for cv in ["Leica M11 + Summilux 50mm f/1.4"]:
                        if cv not in sg["token_values"]:
                            sg["token_values"].append(cv)
                    break
            updated_existing += 1

        # Extreme Close-Up 규칙에 Skin Realism 추가
        if trigger_cat == "샷구성" and trigger_val == "Extreme Close-Up":
            has_quality = False
            for sg in rule["suggest"]:
                if sg["category"] == "품질 & 디테일":
                    for sv in ["Visible Pores", "Detailed Skin Texture", "Natural Skin Oils"]:
                        if sv not in sg["token_values"]:
                            sg["token_values"].append(sv)
                    has_quality = True
                    break
            if not has_quality:
                rule["suggest"].append({
                    "category": "품질 & 디테일",
                    "token_values": ["Visible Pores", "Detailed Skin Texture", "Natural Skin Oils"],
                    "reason": "극사실 피부 디테일 (저자 시그니처)"
                })
            updated_existing += 1

    # 새 규칙 추가
    added = 0
    for rule in new_rules:
        rules.append(rule)
        added += 1

    print("  + 새 규칙 %d개 추가" % added)
    print("  ~ 기존 규칙 %d개 업데이트 (Skin Realism 추가)" % updated_existing)

    return added


def main():
    print("=== 저자 시그니처 프롬프트 키워드 추가 ===\n")

    options_data = load_json("options.json")
    groups_data = load_json("groups.json")
    suggestions_data = load_json("suggestions.json")

    before_opts = len(options_data["options"])
    before_rules = len(suggestions_data["rules"])

    print("[1순위] 피부 리얼리즘 (Skin Realism) 옵션 추가")
    n1 = add_skin_realism(options_data, groups_data)

    print("\n[2순위] 저자 시그니처 카메라 조합 추가")
    n2 = add_camera_combos(options_data)

    print("\n[3순위] 저자 시그니처 조명 키워드 추가")
    n3 = add_lighting_keywords(options_data)

    print("\n[Suggestions] 연관 추천 규칙 추가")
    n4 = add_suggestion_rules(suggestions_data, options_data)

    # 저장
    print("\n--- Saving ---")
    save_json("options.json", options_data)
    save_json("groups.json", groups_data)
    save_json("suggestions.json", suggestions_data)

    after_opts = len(options_data["options"])
    after_rules = len(suggestions_data["rules"])

    print("\n=== 결과 ===")
    print("  옵션: %d → %d (+%d)" % (before_opts, after_opts, after_opts - before_opts))
    print("    - Skin Realism: +%d" % n1)
    print("    - Camera: +%d" % n2)
    print("    - Lighting: +%d" % n3)
    print("  Suggestion 규칙: %d → %d (+%d)" % (before_rules, after_rules, after_rules - before_rules))
    print("  Groups: %d → %d" % (len(groups_data["groups"]) - (1 if n1 > 0 else 0), len(groups_data["groups"])))

    # 검증: 새 옵션이 실제로 JSON에 잘 들어갔는지 확인
    print("\n=== 검증 ===")
    valid_values = {}
    for o in options_data["options"]:
        cn = o["category_name"]
        if cn not in valid_values:
            valid_values[cn] = set()
        valid_values[cn].add(o["value"])

    # 새 suggestion rule에서 참조하는 token_value가 실제 존재하는지 확인
    broken = 0
    for rule in suggestions_data["rules"]:
        trigger_cat = rule["trigger"]["category"]
        trigger_val = rule["trigger"]["token_value"]
        if trigger_cat in valid_values and trigger_val not in valid_values[trigger_cat]:
            print("  !! broken trigger: '%s' not in '%s' (rule: %s)" % (trigger_val, trigger_cat, rule["id"]))
            broken += 1
        for sg in rule.get("suggest", []):
            sg_cat = sg["category"]
            for sv in sg["token_values"]:
                if sg_cat in valid_values and sv not in valid_values[sg_cat]:
                    print("  !! broken suggest: '%s' not in '%s' (rule: %s)" % (sv, sg_cat, rule["id"]))
                    broken += 1
    print("  Broken references: %d" % broken)


if __name__ == "__main__":
    main()
