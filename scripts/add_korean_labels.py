#!/usr/bin/env python3
"""
add_korean_labels.py
====================
모든 옵션에 한글 라벨(label_ko)을 추가합니다.

1단계: description에 한글이 있으면 짧은 한글 요약을 label_ko로 추출
2단계: 한글이 전혀 없는 항목은 매핑 테이블에서 번역

적용 대상:
- Token_DB 시트 (display_label 컬럼에 한글 병기)
- options.json (label_ko 필드)
"""

import json
import re
import openpyxl
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / "data" / "prompt_master_v2.xlsx"
OPTIONS_PATH = BASE_DIR / "src" / "data" / "normalized" / "options.json"

# ─────────────────────────────────────────────
# Manual translations for items with no Korean
# ─────────────────────────────────────────────
MANUAL_KO = {
    # 상단탭 B (Midjourney params)
    "--ar": "화면비",
    "--s / --stylize": "스타일화",
    "--c / --chaos": "카오스",
    "--cref   --cw": "캐릭터 참조",
    "--sref   --sw": "스타일 참조",
    "--oref   --ow": "오브젝트 참조",
    "--iw": "이미지 가중치",
    "--no": "네거티브",
    "--tile": "타일",
    "--Draft": "드래프트",
    "--stealth": "스텔스",
    "--v": "버전",
    "--duration": "길이",
    "--fps": "프레임레이트",
    "--motion": "모션",
    "--loop": "루프",

    # 장르 - Film & Video
    "cinematic film still": "시네마틱 영화 스틸",
    "commercial film frame": "광고 영화 프레임",
    "animation film frame": "애니메이션 영화 프레임",
    "indie movie animation": "인디 영화 애니메이션",

    # 장르 - Animation & Cartoon
    "2D animation still": "2D 애니메이션",
    "3D cartoon style": "3D 카툰 스타일",
    "cartoon style": "카툰 스타일",
    "cartoonish 3D": "카툰풍 3D",
    "Disney Renaissance style": "디즈니 르네상스 스타일",
    "DreamWorks": "드림웍스 스타일",
    "Illumination studio": "일루미네이션 스타일",
    "Pixar style": "픽사 스타일",
    "Pixar/Blender style": "픽사/블렌더 스타일",
    "Pixar animation concept art style": "픽사 컨셉아트 스타일",
    "Hyper realistic Pixar style 3D character": "하이퍼리얼 픽사 3D 캐릭터",
    "A line sketch of a disney-style drawing": "디즈니풍 라인 스케치",

    # 장르 - Anime
    "Japanese anime": "일본 애니메이션",
    "anime-style": "애니메이션 스타일",
    "Makoto Shinkai style": "신카이 마코토 스타일",
    "Japanese anime illustration style": "일본 애니메이션 일러스트",

    # 장르 - Illustration & Art
    "concept art": "컨셉 아트",
    "digital illustration": "디지털 일러스트",
    "digital painting": "디지털 페인팅",
    "illustration": "일러스트레이션",
    "minimalist illustration": "미니멀 일러스트",
    "oil painting": "유화",
    "watercolo": "수채화",
    "fantasy art style": "판타지 아트",
    "A stunning fantasy portrait": "판타지 초상화",
    "DnD art style": "던전앤드래곤 아트",
    "Dungeons and Dragons art style": "던전앤드래곤 아트",
    "dc comics": "DC 코믹스",

    # 장르 - Game
    "3D game asset": "3D 게임 에셋",
    "Game asset design": "게임 에셋 디자인",
    "game character design": "게임 캐릭터 디자인",
    "game environment design": "게임 환경 디자인",
    "casual game": "캐주얼 게임",
    "casual mobile game art style": "캐주얼 모바일 게임",
    "Gardenescapes": "가든스케이프 스타일",
    "Overwatch": "오버워치 스타일",
    "fortnite style": "포트나이트 스타일",
    "bright western casual mobile game style": "서양 캐주얼 모바일 게임",
    "colorful social mobile game style": "소셜 모바일 게임",

    # 장르 - Style
    "photorealistic": "포토리얼리스틱",
    "semi-realistic character design": "세미리얼 캐릭터",
    "stylized 3D render": "스타일라이즈 3D 렌더",

    # 장르 - Photography
    "fashion editorial photography": "패션 화보 사진",
    "portrait photography": "인물 사진",

    # 품질 & 디테일
    "4K": "4K 해상도",
    "chibi details": "치비 디테일",
}


def extract_short_korean(desc: str) -> str:
    """
    description에서 짧은 한글 요약을 추출합니다.
    예: "(광원을 확산시켜 부드럽고 균일한 빛을 만드는 기법...)" → "부드러운 확산광"
    
    전략: 괄호 안 한글 텍스트에서 첫 번째 문장/구를 가져오되
    너무 길면 10자 이내로 자름
    """
    if not desc:
        return ""

    # Remove leading/trailing parens
    text = desc.strip()
    if text.startswith("("):
        text = text[1:]
    if text.endswith(")"):
        text = text[:-1]
    text = text.strip()

    # If text has Korean, extract it
    if not re.search(r'[\uac00-\ud7a3]', text):
        return ""

    # Find the Korean portion
    # Split on common delimiters
    # Try to get a short phrase
    
    # If text starts with Korean, take until first delimiter
    # If text is short (< 15 chars), use as-is
    if len(text) <= 15:
        return text

    # Split by common delimiters: /, ,, ., 。
    parts = re.split(r'[/,\.。]', text)
    for p in parts:
        p = p.strip()
        if re.search(r'[\uac00-\ud7a3]', p) and len(p) <= 20:
            return p

    # Take first N characters up to a natural break
    # Find a natural break point within first 15 chars
    short = text[:20]
    # Find last space or particle boundary
    for i in range(min(15, len(short)), 5, -1):
        if short[i-1] in ' ,./을를이가은는에서의과와':
            return short[:i].rstrip(' ,./을를이가은는에서의과와').strip()

    return text[:12]


def main():
    print("=" * 60)
    print("Add Korean Labels to All Options")
    print("=" * 60)

    # Load current options
    with open(OPTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    opts = data["options"]

    updated_count = 0
    from_desc = 0
    from_manual = 0
    still_missing = []

    for o in opts:
        if o.get("label_ko"):
            continue  # Already has Korean label

        value = o["value"]
        desc = o.get("description", "")

        # Try manual mapping first (higher quality)
        if value in MANUAL_KO:
            o["label_ko"] = MANUAL_KO[value]
            from_manual += 1
            updated_count += 1
            continue

        # Try extracting from description
        ko = extract_short_korean(desc)
        if ko:
            o["label_ko"] = ko
            from_desc += 1
            updated_count += 1
            continue

        still_missing.append((o["category_name"], value))

    print(f"\nUpdated: {updated_count}")
    print(f"  From description: {from_desc}")
    print(f"  From manual mapping: {from_manual}")
    print(f"  Still missing: {len(still_missing)}")

    if still_missing:
        print("\n⚠ Still missing Korean labels:")
        for cat, val in still_missing:
            print(f"  [{cat}] {val}")

    # Save updated options.json
    data["options"] = opts
    with open(OPTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\noptions.json saved ({len(opts)} options)")

    # Also update Excel Token_DB
    print("\nUpdating Excel Token_DB...")
    backup = EXCEL_PATH.with_suffix(EXCEL_PATH.suffix + ".pre-korean-backup")
    shutil.copy2(EXCEL_PATH, backup)

    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb["Token_DB"]

    # Build lookup from options: token_id -> label_ko
    ko_lookup = {}
    for o in opts:
        if o.get("label_ko"):
            ko_lookup[o["option_id"]] = o["label_ko"]

    excel_updated = 0
    for row in range(2, ws.max_row + 1):
        tid = str(ws.cell(row, 1).value or "").strip()
        if tid in ko_lookup:
            current_desc = str(ws.cell(row, 11).value or "").strip()  # description col
            ko = ko_lookup[tid]
            # Update description if it doesn't already contain this Korean text
            if ko not in current_desc:
                if current_desc:
                    ws.cell(row, 11, f"({ko}) {current_desc}")
                else:
                    ws.cell(row, 11, f"({ko})")
                excel_updated += 1

    wb.save(EXCEL_PATH)
    print(f"Excel updated: {excel_updated} rows")
    print(f"Backup: {backup.name}")

    # Verify
    has_ko = sum(1 for o in opts if o.get("label_ko"))
    no_ko = sum(1 for o in opts if not o.get("label_ko"))
    print(f"\nFinal: {has_ko} with Korean, {no_ko} without")


if __name__ == "__main__":
    main()
