#!/usr/bin/env python3
"""
Add Model_DB sheet to prompt_master_v2.xlsx
===========================================
Adds a new 'Model_DB' sheet with all model/block definitions.
This replaces the hardcoded create_blocks() function in convert_excel_v2.py.

Columns:
  block_id, label, prompt_format, version, sort_order,
  default_ar, default_stylize, default_chaos, default_version,
  default_fps, default_duration, default_motion, default_steps, default_cfg_scale,
  cap_aspect_ratio, cap_stylize, cap_chaos, cap_sref, cap_cref, cap_oref,
  cap_iw, cap_tile, cap_no, cap_draft, cap_stealth, cap_profile, cap_version,
  cap_fps, cap_duration, cap_motion, cap_loop, cap_camera_movement,
  cap_steps, cap_cfg_scale, cap_style, cap_guidance
"""

import openpyxl
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / "data" / "prompt_master_v2.xlsx"

# All capability column names (order matters for header)
CAP_COLS = [
    "cap_aspect_ratio", "cap_stylize", "cap_chaos",
    "cap_sref", "cap_cref", "cap_oref", "cap_iw",
    "cap_tile", "cap_no", "cap_draft", "cap_stealth",
    "cap_profile", "cap_version",
    "cap_fps", "cap_duration", "cap_motion", "cap_loop",
    "cap_camera_movement", "cap_steps", "cap_cfg_scale",
    "cap_style", "cap_guidance",
]

DEFAULT_COLS = [
    "default_ar", "default_stylize", "default_chaos", "default_version",
    "default_fps", "default_duration", "default_motion",
    "default_steps", "default_cfg_scale",
]

HEADER = ["block_id", "label", "prompt_format", "version", "sort_order"] + DEFAULT_COLS + CAP_COLS

# Current 11 models (migrated from hardcoded create_blocks)
MODELS = [
    {
        "block_id": "midjourney", "label": "Midjourney v7",
        "prompt_format": "midjourney", "version": "7", "sort_order": 1,
        "default_ar": "1:1", "default_stylize": 100, "default_chaos": 0, "default_version": "7",
        "cap_aspect_ratio": True, "cap_stylize": True, "cap_chaos": True,
        "cap_sref": True, "cap_cref": True, "cap_oref": False, "cap_iw": True,
        "cap_tile": True, "cap_no": True, "cap_draft": True, "cap_stealth": False,
        "cap_profile": True, "cap_version": True,
        "cap_fps": False, "cap_duration": False, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": False, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "midjourney_niji", "label": "Midjourney Niji",
        "prompt_format": "midjourney", "version": "niji", "sort_order": 2,
        "default_ar": "1:1", "default_stylize": 100, "default_chaos": 0, "default_version": "niji",
        "cap_aspect_ratio": True, "cap_stylize": True, "cap_chaos": True,
        "cap_sref": True, "cap_cref": True, "cap_oref": False, "cap_iw": True,
        "cap_tile": True, "cap_no": True, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": True,
        "cap_fps": False, "cap_duration": False, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": False, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "midjourney_v6_1", "label": "Midjourney v6.1",
        "prompt_format": "midjourney", "version": "6.1", "sort_order": 3,
        "default_ar": "1:1", "default_stylize": 100, "default_chaos": 0, "default_version": "6.1",
        "cap_aspect_ratio": True, "cap_stylize": True, "cap_chaos": True,
        "cap_sref": True, "cap_cref": True, "cap_oref": False, "cap_iw": True,
        "cap_tile": True, "cap_no": True, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": True,
        "cap_fps": False, "cap_duration": False, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": False, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "midjourney_v6", "label": "Midjourney v6",
        "prompt_format": "midjourney", "version": "6", "sort_order": 4,
        "default_ar": "1:1", "default_stylize": 100, "default_chaos": 0, "default_version": "6",
        "cap_aspect_ratio": True, "cap_stylize": True, "cap_chaos": True,
        "cap_sref": True, "cap_cref": True, "cap_oref": False, "cap_iw": True,
        "cap_tile": True, "cap_no": True, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": True,
        "cap_fps": False, "cap_duration": False, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": False, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "midjourney_v5_2", "label": "Midjourney v5.2",
        "prompt_format": "midjourney", "version": "5.2", "sort_order": 5,
        "default_ar": "1:1", "default_stylize": 100, "default_chaos": 0, "default_version": "5.2",
        "cap_aspect_ratio": True, "cap_stylize": True, "cap_chaos": True,
        "cap_sref": False, "cap_cref": False, "cap_oref": False, "cap_iw": True,
        "cap_tile": True, "cap_no": True, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": True,
        "cap_fps": False, "cap_duration": False, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": False, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "midjourney_video", "label": "Midjourney Video",
        "prompt_format": "midjourney", "version": "video", "sort_order": 6,
        "default_ar": "16:9", "default_stylize": 100, "default_version": "video",
        "cap_aspect_ratio": True, "cap_stylize": True, "cap_chaos": False,
        "cap_sref": True, "cap_cref": False, "cap_oref": False, "cap_iw": False,
        "cap_tile": False, "cap_no": True, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": True,
        "cap_fps": False, "cap_duration": True, "cap_motion": True, "cap_loop": False,
        "cap_camera_movement": True, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "stable_diffusion", "label": "Stable Diffusion",
        "prompt_format": "stable_diffusion", "sort_order": 7,
        "default_ar": "1:1", "default_steps": 30, "default_cfg_scale": 7,
        "cap_aspect_ratio": True, "cap_stylize": False, "cap_chaos": False,
        "cap_sref": False, "cap_cref": False, "cap_oref": False, "cap_iw": False,
        "cap_tile": False, "cap_no": True, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": False,
        "cap_fps": False, "cap_duration": False, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": False, "cap_steps": True, "cap_cfg_scale": True,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "runway_gen3", "label": "Runway Gen-3",
        "prompt_format": "natural", "sort_order": 8,
        "default_ar": "16:9", "default_fps": 24, "default_duration": 4, "default_motion": 3,
        "cap_aspect_ratio": True, "cap_stylize": False, "cap_chaos": False,
        "cap_sref": False, "cap_cref": False, "cap_oref": False, "cap_iw": False,
        "cap_tile": False, "cap_no": False, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": False,
        "cap_fps": True, "cap_duration": True, "cap_motion": True, "cap_loop": True,
        "cap_camera_movement": True, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "kling_ai", "label": "Kling AI",
        "prompt_format": "natural", "sort_order": 9,
        "default_ar": "16:9", "default_fps": 30, "default_duration": 5, "default_motion": 3,
        "cap_aspect_ratio": True, "cap_stylize": False, "cap_chaos": False,
        "cap_sref": False, "cap_cref": False, "cap_oref": False, "cap_iw": False,
        "cap_tile": False, "cap_no": False, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": False,
        "cap_fps": True, "cap_duration": True, "cap_motion": True, "cap_loop": False,
        "cap_camera_movement": True, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": True,
    },
    {
        "block_id": "sora", "label": "Sora",
        "prompt_format": "natural", "sort_order": 10,
        "default_ar": "16:9", "default_duration": 5,
        "cap_aspect_ratio": True, "cap_stylize": False, "cap_chaos": False,
        "cap_sref": False, "cap_cref": False, "cap_oref": False, "cap_iw": False,
        "cap_tile": False, "cap_no": False, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": False,
        "cap_fps": False, "cap_duration": True, "cap_motion": False, "cap_loop": True,
        "cap_camera_movement": True, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
    {
        "block_id": "veo", "label": "Veo (Google)",
        "prompt_format": "natural", "sort_order": 11,
        "default_ar": "16:9", "default_fps": 24, "default_duration": 4,
        "cap_aspect_ratio": True, "cap_stylize": False, "cap_chaos": False,
        "cap_sref": False, "cap_cref": False, "cap_oref": False, "cap_iw": False,
        "cap_tile": False, "cap_no": False, "cap_draft": False, "cap_stealth": False,
        "cap_profile": False, "cap_version": False,
        "cap_fps": True, "cap_duration": True, "cap_motion": False, "cap_loop": False,
        "cap_camera_movement": True, "cap_steps": False, "cap_cfg_scale": False,
        "cap_style": False, "cap_guidance": False,
    },
]


def main():
    print(f"Opening: {EXCEL_PATH}")
    wb = openpyxl.load_workbook(EXCEL_PATH)

    # Remove existing Model_DB sheet if present
    if "Model_DB" in wb.sheetnames:
        del wb["Model_DB"]
        print("  Removed existing Model_DB sheet")

    ws = wb.create_sheet("Model_DB")

    # Header row
    for col_idx, col_name in enumerate(HEADER, 1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = openpyxl.styles.Font(bold=True)

    # Data rows
    for row_idx, model in enumerate(MODELS, 2):
        for col_idx, col_name in enumerate(HEADER, 1):
            val = model.get(col_name, "")
            # Convert booleans to TRUE/FALSE strings for Excel
            if isinstance(val, bool):
                val = "TRUE" if val else "FALSE"
            ws.cell(row=row_idx, column=col_idx, value=val)

    # Auto-width columns
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max_length + 2, 25)

    wb.save(EXCEL_PATH)
    print(f"  Model_DB sheet added with {len(MODELS)} models")
    print(f"  Columns: {len(HEADER)}")
    print(f"  Saved: {EXCEL_PATH}")


if __name__ == "__main__":
    main()
