#!/usr/bin/env python3
"""프롬프트 해부학 분석에서 도출된 누락 옵션 추가 스크립트"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPTIONS_PATH = os.path.join(BASE, "src", "data", "normalized", "options.json")
GROUPS_PATH = os.path.join(BASE, "src", "data", "normalized", "groups.json")

# ── Load ──
with open(OPTIONS_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)
opts = data["options"]

with open(GROUPS_PATH, "r", encoding="utf-8") as f:
    groups_data = json.load(f)

existing_ids = {o["option_id"] for o in opts}
new_options = []

# ── 1. Skin Realism (품질 & 디테일 카테고리) ──
cat_id_quality = "cat_f0183f05"
skin_realism = [
    ("Visible Pores", "모공이 보이는", "모공이 보이는 디테일한 피부 질감으로 초사실적인 인물 표현"),
    ("Natural Skin Oils", "자연스러운 피부 유분", "피부의 자연스러운 유분기와 번들거림 — 빛 반사로 3D 입체감"),
    ("Fine Facial Hair", "얼굴의 미세 솜털", "인물의 미세한 솜털을 표현하여 AI 인형 느낌 탈피"),
    ("Unretouched", "보정하지 않은 날것", "무보정 다큐멘터리 스타일 — 수정 없는 있는 그대로의 모습"),
    ("Raw Authentic Beauty", "날것의 진정한 아름다움", "꾸밈 없는 날것의 아름다움, 불완전함 속의 미학"),
    ("Detailed Skin Texture", "디테일한 피부 질감", "주름, 모공, 잡티까지 세밀하게 묘사된 피부 텍스처"),
    ("Raw Beauty Documentation", "날것의 아름다움 기록", "아름다움을 기록하듯 담아내는 다큐멘터리 감성"),
]

for i, (val, ko, desc) in enumerate(skin_realism):
    oid = "opt_skin_" + val.lower().replace(" ", "_").replace("'", "")
    if oid not in existing_ids:
        new_options.append({
            "option_id": oid,
            "category_id": cat_id_quality,
            "category_name": "품질 & 디테일",
            "value": val,
            "value_raw": val,
            "label": ko,
            "label_en": val,
            "label_ko": ko,
            "group": "Skin Realism",
            "sort_order": 18 + i,
            "media_type": "image",
            "default_generated": False,
            "description": desc,
        })

# ── 2. New Camera: Leica M11 + Summilux 50mm f/1.4 ──
cam_opts = [o for o in opts if o.get("category_name", "") == "카메라&렌즈"]
cam_cat_id = cam_opts[0]["category_id"]

oid_leica = "opt_cam_leica_m11_summilux_50mm"
if oid_leica not in existing_ids:
    new_options.append({
        "option_id": oid_leica,
        "category_id": cam_cat_id,
        "category_name": "카메라&렌즈",
        "value": "Leica M11 + Summilux 50mm f/1.4",
        "value_raw": "Leica M11 + Summilux 50mm f/1.4",
        "label": "f/1.4 개방에서 몽환적인 보케",
        "label_en": "Leica M11 + Summilux 50mm f/1.4",
        "label_ko": "f/1.4 개방에서 몽환적인 보케가 피어나고",
        "group": "인물",
        "sort_order": 6,
        "media_type": "image",
        "default_generated": False,
        "description": "f/1.4 개방에서 몽환적인 보케가 피어나고, 라이카 특유의 색감이 피부를 자연스럽게 담아내. 수동 포커싱으로 찍는 순간의 집중이 사진에 체온을 불어넣어",
    })

# ── 3. New Camera: Nikon Z9 + MC 105mm macro ──
oid_nikon_z9 = "opt_cam_nikon_z9_mc105mm"
if oid_nikon_z9 not in existing_ids:
    new_options.append({
        "option_id": oid_nikon_z9,
        "category_id": cam_cat_id,
        "category_name": "카메라&렌즈",
        "value": "Nikon Z9 + NIKKOR Z MC 105mm f/2.8 VR S",
        "value_raw": "Nikon Z9 + NIKKOR Z MC 105mm f/2.8 VR S",
        "label": "Z9의 강력한 AF와 매크로 렌즈",
        "label_en": "Nikon Z9 + NIKKOR Z MC 105mm f/2.8 VR S",
        "label_ko": "Z9의 강력한 AF와 매크로 렌즈로",
        "group": "매크로",
        "sort_order": 20,
        "media_type": "image",
        "default_generated": False,
        "description": "Z9의 강력한 AF와 매크로 렌즈로 모공, 솜털까지 극사실로 포착. 손떨림 보정이 뛰어나 삼각대 없이도 피부 질감을 선명하게 담아내",
    })

# ── 4. New Lighting ──
light_opts = [o for o in opts if o.get("category_name", "") == "조명"]
light_cat_id = light_opts[0]["category_id"]

new_lights = [
    ("Harsh Midday Sun", "한낮의 거친 태양빛", "정오의 강렬한 직사광 — 깊은 그림자와 거친 콘트라스트", "자연광", 74),
    ("Late Afternoon Warmth", "늦은 오후의 따뜻한 빛", "해질녘 따뜻한 빛 — 부드러운 오렌지 톤의 감성 조명", "자연광", 75),
    ("Soft Diffused Daylight", "부드럽게 확산된 자연 주광", "구름이나 커튼으로 확산된 부드러운 자연광 — 그림자 없는 균일한 빛", "자연광", 76),
]

for val, ko, desc, grp, so in new_lights:
    oid = "opt_light_" + val.lower().replace(" ", "_")
    if oid not in existing_ids:
        new_options.append({
            "option_id": oid,
            "category_id": light_cat_id,
            "category_name": "조명",
            "value": val,
            "value_raw": val,
            "label": ko,
            "label_en": val,
            "label_ko": ko,
            "group": grp,
            "sort_order": so,
            "media_type": "all",
            "default_generated": False,
            "description": desc,
        })

# ── Save options ──
opts.extend(new_options)
data["options"] = opts
with open(OPTIONS_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Added {len(new_options)} new options. Total: {len(opts)}")
for o in new_options:
    print(f"  + {o['value']} ({o['category_name']} / {o['group']})")

# ── 5. Add Skin Realism group to groups.json ──
existing_groups = {(g["category"], g["group"]) for g in groups_data["groups"]}
if ("품질 & 디테일", "Skin Realism") not in existing_groups:
    groups_data["groups"].append({
        "category": "품질 & 디테일",
        "group": "Skin Realism",
        "group_ko": "피부 리얼리즘",
        "sort_order": 2,
    })
    with open(GROUPS_PATH, "w", encoding="utf-8") as f:
        json.dump(groups_data, f, ensure_ascii=False, indent=2)
    print("\nAdded 'Skin Realism' group to groups.json")

print("\nDone!")
