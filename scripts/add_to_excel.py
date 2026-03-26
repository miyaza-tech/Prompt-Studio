#!/usr/bin/env python3
"""
Excel에 프롬프트 해부학 옵션 12개를 추가하는 스크립트.
- 조명/자연광: Harsh Midday Sun, Late Afternoon Warmth, Soft Diffused Daylight
- 카메라/스트리트: Leica M11 + Summilux 50mm f/1.4
- 카메라/매크로: Nikon Z9 + MC 105mm
- 품질 & 디테일: Skin Realism 7개
"""

import openpyxl
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / "data" / "prompt_master.xlsx"

# Backup
shutil.copy2(EXCEL_PATH, EXCEL_PATH.with_suffix('.xlsx.pre-anatomy-backup'))
print("Backup created")

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb['체크박스']

# ============================================================
# 1. 조명 / 자연광 그룹 (col 8=group, col 9=value)
#    자연광 그룹: Row 43~53
#    특수환경 시작: Row 54
#    → Row 54에 3행 삽입
# ============================================================
ws.insert_rows(54, 3)
lighting = [
    "Harsh Midday Sun (정오의 강한 직사광선으로 깊은 그림자와 높은 대비를 만듦. 다큐멘터리나 거친 사실적 묘사에 적합)",
    "Late Afternoon Warmth (늦은 오후의 따뜻한 빛으로 긴 그림자와 부드러운 금빛 톤을 연출. 감성적인 인물 사진에 효과적)",
    "Soft Diffused Daylight (부드럽게 확산된 자연광으로 그림자가 거의 없는 균일한 조명. 제품 촬영이나 자연스러운 인물 사진에 적합)",
]
for i, val in enumerate(lighting):
    ws.cell(54 + i, 9, val)
    # col 8 = None → 자연광 그룹 계승 (row 43에서 설정됨)
print(f"Added 3 lighting options at rows 54-56 (자연광 group)")

# 행 삽입으로 이후 모든 행 +3 shift

# ============================================================
# 2. 카메라 / 스트리트 그룹 (col 12=group, col 13=value)
#    원래 스트리트: Row 9-11, shift후: Row 12-14
#    원래 스포츠야생: Row 12, shift후: Row 15
#    → Row 15에 1행 삽입 (스트리트 그룹 마지막에 추가)
# ============================================================
ws.insert_rows(15, 1)
ws.cell(15, 13, "Leica M11 + Summilux 50mm f/1.4(50mm 화각의 클래식한 렌즈. 보케가 아름답고 인물·스트리트 모두에서 뛰어난 표현력)")
print("Added Leica M11 + Summilux at row 15 (스트리트 group)")

# 이후 모든 행 +1 shift (총 +4)

# ============================================================
# 3. 카메라 / 매크로 그룹 (col 12=group, col 13=value)
#    원래 매크로: Row 18-20, shift후: Row 22-24
#    원래 천체: Row 21, shift후: Row 25
#    → Row 25에 1행 삽입 (매크로 그룹 마지막에 추가)
# ============================================================
ws.insert_rows(25, 1)
ws.cell(25, 13, "Nikon Z9 + NIKKOR Z MC 105mm f/2.8 VR S(1:1 매크로에 VR 보정으로 손떨림 방지. 곤충, 꽃 등 극접사 촬영의 끝판왕)")
print("Added Nikon Z9 + MC 105mm at row 25 (매크로 group)")

# 이후 모든 행 +1 shift (총 +5)

# ============================================================
# 4. 품질 & 디테일 (col 19) - Skin Realism 7개
#    col 19에 그룹 없음, 값만 나열
#    마지막 행 이후에 추가
# ============================================================
last_quality = 0
for r in range(3, ws.max_row + 1):
    if ws.cell(r, 19).value:
        last_quality = r

skin_options = [
    "Visible Pores (피부의 모공이 자연스럽게 보이는 극사실적 표현)",
    "Natural Skin Oils (피부 위의 자연스러운 유분기와 윤기 표현)",
    "Fine Facial Hair (잔털과 솜털이 보이는 세밀한 피부 묘사)",
    "Unretouched (보정하지 않은 원본 그대로의 피부 질감)",
    "Raw Authentic Beauty (있는 그대로의 자연스러운 아름다움 표현)",
    "Detailed Skin Texture (피부 결, 주름, 잡티 등 세밀한 질감 묘사)",
    "Raw Beauty Documentation (자연미를 기록하는 다큐멘터리적 접근)",
]

for i, val in enumerate(skin_options):
    ws.cell(last_quality + 1 + i, 19, val)
print(f"Added {len(skin_options)} Skin Realism options at rows {last_quality+1}-{last_quality+len(skin_options)}")

# ============================================================
# Save
# ============================================================
wb.save(EXCEL_PATH)
print(f"\n=== Excel saved: {EXCEL_PATH} ===")
print("Now run: npm run convert:data")
