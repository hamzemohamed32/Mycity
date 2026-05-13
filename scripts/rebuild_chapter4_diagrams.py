from __future__ import annotations

import math
import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"C:\Users\xamse\OneDrive\Desktop\hamze.apps\my-city")
PACKAGE_ROOT = ROOT / "tmp" / "chapter4_check2"
MEDIA_DIR = PACKAGE_ROOT / "word" / "media"
OUTPUT_DOCX = ROOT / "output" / "doc" / "MyCity_Chapter_Four_Final.docx"


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    font_paths = [
        Path(r"C:\Windows\Fonts") / name,
        Path(r"C:\Windows\Fonts") / "arial.ttf",
    ]
    for path in font_paths:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


FONT_SANS = lambda size: load_font("arial.ttf", size)
FONT_SANS_BOLD = lambda size: load_font("arialbd.ttf", size)
FONT_MONO_BOLD = lambda size: load_font("consolab.ttf", size)


def new_canvas(width: int, height: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (width, height), "white")
    return image, ImageDraw.Draw(image)


def text_box(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, text: str, font, fill: str = "#111111", align: str = "center") -> None:
    bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=4, align=align)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x + (w - tw) / 2 if align == "center" else x
    ty = y + (h - th) / 2
    draw.multiline_text((tx, ty), text, font=font, fill=fill, spacing=4, align=align)


def label(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font, fill: str = "#111111", anchor: str = "la") -> None:
    draw.multiline_text((x, y), text, font=font, fill=fill, spacing=4, anchor=anchor, align="left")


def rounded_box(draw: ImageDraw.ImageDraw, xy, text: str, fill: str, outline: str, radius: int = 18, width: int = 4, font=None, text_fill: str = "#111111") -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    x1, y1, x2, y2 = xy
    text_box(draw, x1, y1, x2 - x1, y2 - y1, text, font or FONT_SANS_BOLD(26), text_fill)


def box(draw: ImageDraw.ImageDraw, xy, text: str, fill: str, outline: str, width: int = 4, radius: int = 12, font=None, text_fill: str = "#111111") -> None:
    rounded_box(draw, xy, text, fill, outline, radius, width, font or FONT_SANS_BOLD(24), text_fill)


def diamond(draw: ImageDraw.ImageDraw, cx: int, cy: int, w: int, h: int, text: str, font=None) -> None:
    points = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
    draw.polygon(points, fill="white", outline="#111111", width=4)
    bbox = draw.multiline_textbbox((0, 0), text, font=font or FONT_SANS_BOLD(22), spacing=4, align="center")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.multiline_text((cx - tw / 2, cy - th / 2), text, font=font or FONT_SANS_BOLD(22), fill="#111111", spacing=4, align="center")


def line(draw: ImageDraw.ImageDraw, points, fill: str = "#4b4f58", width: int = 6) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")


def arrow(draw: ImageDraw.ImageDraw, points, fill: str = "#4b4f58", width: int = 6, head: int = 16) -> None:
    if len(points) < 2:
      return
    line(draw, points, fill=fill, width=width)
    (x1, y1), (x2, y2) = points[-2], points[-1]
    angle = math.atan2(y2 - y1, x2 - x1)
    left = (x2 - head * math.cos(angle - math.pi / 6), y2 - head * math.sin(angle - math.pi / 6))
    right = (x2 - head * math.cos(angle + math.pi / 6), y2 - head * math.sin(angle + math.pi / 6))
    draw.polygon([(x2, y2), left, right], fill=fill)


def phone_frame(draw: ImageDraw.ImageDraw, xy, title: str) -> None:
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=30, outline="#111111", width=4, fill="white")
    draw.rounded_rectangle((x1 + 110, y1 + 18, x2 - 110, y1 + 34), radius=8, fill="#111111")
    text_box(draw, x1 + 40, y1 + 45, (x2 - x1) - 80, 44, title, FONT_SANS_BOLD(32))


def make_org_chart() -> Image.Image:
    image, draw = new_canvas(1200, 720)
    label(draw, 70, 45, "Organizational Chart\nMyCity Smart City", FONT_MONO_BOLD(34))

    rounded_box(draw, (735, 24, 945, 96), "System Administrator", "white", "#6aa9ef", radius=34, width=6, font=FONT_SANS_BOLD(24))
    line(draw, [(840, 96), (840, 140)], fill="#ef2323")
    rounded_box(draw, (680, 145, 1000, 223), "City Administrator", "white", "#55c25f", radius=38, width=6, font=FONT_SANS_BOLD(26))

    line(draw, [(840, 223), (840, 310)])
    line(draw, [(420, 310), (1020, 310)])
    line(draw, [(420, 310), (420, 382)])
    line(draw, [(1020, 310), (1020, 382)])

    box(draw, (250, 396, 590, 492), "Citizen Users", "#d2cffc", "#8079e8", font=FONT_MONO_BOLD(30))
    box(draw, (690, 396, 1110, 492), "District Administrators", "#a9c8f2", "#5a8edf", font=FONT_MONO_BOLD(26))
    return image


def patch_document_xml() -> None:
    document_xml = PACKAGE_ROOT / "word" / "document.xml"
    text = document_xml.read_text(encoding="utf-8")
    replacements = {
        "4.1 MyCity Smart City Platform Requirements": "MyCity Smart City Platform Requirements",
        "4.1.1 Organizational Chart": "Organizational Chart",
        "4.1.2 User Requirements": "User Requirements",
        "4.1.2.1 Functional Requirements": "Functional Requirements",
        "4.1.2.2 Non-Functional Requirements": "Non-Functional Requirements",
        "The MyCity platform follows a civic operations hierarchy. The System Administrator manages platform configuration, security, and access control. The City Administrator oversees city-wide complaint performance and cross-district supervision. District Administrators review complaints inside their assigned districts and coordinate operational response. Platform support maintains backend, queue, and notification operations, while citizens act as the reporting users who submit issues, track progress, support complaints, and receive updates.": "The organization chart now shows only the roles that exist in the project code. The System Administrator manages platform configuration, security, and access control. The City Administrator oversees cross-district complaint performance. District Administrators review and manage complaints assigned to their districts. Citizens are the reporting users who create accounts, submit complaints, track progress, and receive updates.",
        "C. City and Platform Administration Requirements": "C. City and System Administration Requirements",
        "Platform administrators must manage roles such as citizen, district administrator, city administrator, and system administrator.": "System administrators must manage roles such as citizen, district administrator, city administrator, and system administrator.",
        "Platform operations must observe notification delivery results and queue health so asynchronous updates remain reliable.": "System administrators must observe notification delivery results and queue health so asynchronous updates remain reliable.",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    document_xml.write_text(text, encoding="utf-8")


def make_auth_flow() -> Image.Image:
    image, draw = new_canvas(1200, 1380)
    rounded_box(draw, (450, 18, 750, 92), "Start", "white", "#ef2323", radius=38, width=6, font=FONT_SANS_BOLD(26))
    arrow(draw, [(600, 92), (600, 150)], fill="#ef2323")
    box(draw, (345, 150, 855, 226), "Open Login / Register Screen", "#71a3e2", "#2e74d4", font=FONT_SANS_BOLD(24))
    arrow(draw, [(600, 226), (600, 300)])
    box(draw, (340, 300, 860, 378), "User selects Register or Login", "#2f78d7", "#1750a7", font=FONT_SANS_BOLD(24), text_fill="white")

    label(draw, 120, 420, "Register", FONT_MONO_BOLD(34), fill="#5d59ed")
    label(draw, 958, 420, "Login", FONT_MONO_BOLD(34), fill="#2b73dc")

    arrow(draw, [(340, 338), (250, 338), (250, 508)])
    arrow(draw, [(860, 338), (970, 338), (970, 508)])

    box(draw, (150, 508, 350, 576), "Register", "#d2cffc", "#8079e8", font=FONT_MONO_BOLD(22))
    arrow(draw, [(250, 576), (250, 650)], fill="#d85a00")
    box(draw, (110, 650, 390, 734), "Enter name, email /\nphone, password", "#8f89ef", "#6155ea", font=FONT_MONO_BOLD(20), text_fill="white")
    arrow(draw, [(250, 734), (250, 812)], fill="#d85a00")
    box(draw, (150, 812, 350, 878), "Validate Input", "#55c45a", "#169b2c", font=FONT_MONO_BOLD(22))
    arrow(draw, [(250, 878), (250, 948)])
    diamond(draw, 250, 1002, 160, 130, "Valid?", FONT_MONO_BOLD(22))

    label(draw, 342, 982, "Yes", FONT_SANS_BOLD(20))
    arrow(draw, [(250, 1066), (250, 1130)])
    box(draw, (160, 1130, 340, 1200), "Save User\nRecord", "#ffe34b", "#cfa800", font=FONT_MONO_BOLD(20))
    arrow(draw, [(250, 1200), (250, 1260)], fill="#cfa800")
    box(draw, (140, 1260, 360, 1330), "Success Message", "#ffd42f", "#cfa000", font=FONT_MONO_BOLD(20))

    label(draw, 76, 980, "No", FONT_SANS_BOLD(20))
    arrow(draw, [(170, 1002), (110, 1002)])
    box(draw, (20, 944, 150, 1016), "Show Error", "#b8d0f4", "#2c74d3", font=FONT_MONO_BOLD(16))
    arrow(draw, [(85, 1016), (85, 1080)], fill="#d38cff")
    box(draw, (20, 1080, 185, 1150), "Re-enter Data", "#13a01a", "#118915", font=FONT_MONO_BOLD(18), text_fill="white")
    arrow(draw, [(102, 1080), (102, 692), (110, 692)], fill="#118915")

    box(draw, (830, 508, 1110, 576), "Login", "#c7daf8", "#5a8edf", font=FONT_MONO_BOLD(22))
    arrow(draw, [(970, 576), (970, 650)], fill="#d38cff")
    box(draw, (830, 650, 1110, 730), "Enter email / phone and\npassword", "#71aef4", "#2e74d4", font=FONT_MONO_BOLD(20))
    arrow(draw, [(970, 730), (970, 806)], fill="#d38cff")
    box(draw, (855, 806, 1085, 884), "Validate\nCredentials", "#2f78d7", "#1750a7", font=FONT_MONO_BOLD(20), text_fill="white")
    arrow(draw, [(970, 884), (970, 948)])
    diamond(draw, 970, 1002, 160, 130, "Valid?", FONT_MONO_BOLD(22))

    label(draw, 820, 982, "Yes", FONT_SANS_BOLD(20))
    arrow(draw, [(970, 1066), (970, 1130)])
    box(draw, (860, 1130, 1080, 1200), "Create Session", "#d8cca7", "#9f8d5a", font=FONT_MONO_BOLD(20))
    arrow(draw, [(970, 1200), (970, 1260)], fill="#8a7a50")
    box(draw, (810, 1260, 1130, 1330), "Redirect to Home Map", "#a99b75", "#7a6d4f", font=FONT_MONO_BOLD(18), text_fill="white")

    label(draw, 1058, 982, "No", FONT_SANS_BOLD(20))
    arrow(draw, [(1050, 1002), (1090, 1002)])
    box(draw, (1030, 944, 1175, 1016), "Show Error", "#eb6bd3", "#b73ba7", font=FONT_MONO_BOLD(16))
    arrow(draw, [(1102, 1016), (1102, 1080)], fill="#111111")
    box(draw, (1010, 1080, 1175, 1150), "Re-enter Login", "#b01cf2", "#8611ba", font=FONT_MONO_BOLD(18), text_fill="white")
    arrow(draw, [(1175, 1115), (1190, 1115), (1190, 690), (1110, 690)], fill="#4b4f58")

    line(draw, [(250, 1330), (250, 1360), (970, 1360), (970, 1330)])
    rounded_box(draw, (460, 1326, 740, 1378), "End", "white", "#ef2323", radius=28, width=6, font=FONT_SANS_BOLD(24))
    return image


def make_auth_ui() -> Image.Image:
    image, draw = new_canvas(980, 680)
    phone_frame(draw, (205, 28, 775, 650), "MyCity")
    label(draw, 490, 120, "Create account / Sign in", FONT_SANS(20), anchor="ma")
    box(draw, (270, 170, 710, 234), "Full name", "#eef4ff", "#2d74d3", width=3, radius=10, font=FONT_SANS_BOLD(18))
    box(draw, (270, 260, 710, 324), "Email or phone", "#eef4ff", "#2d74d3", width=3, radius=10, font=FONT_SANS_BOLD(18))
    box(draw, (270, 350, 710, 414), "Password", "#eef4ff", "#2d74d3", width=3, radius=10, font=FONT_SANS_BOLD(18))
    rounded_box(draw, (325, 455, 655, 525), "Create account / Sign in", "white", "#ef2323", radius=34, width=5, font=FONT_SANS_BOLD(22))
    box(draw, (370, 548, 610, 594), "Switch mode", "#111111", "#111111", width=2, radius=10, font=FONT_SANS_BOLD(16), text_fill="white")
    box(draw, (32, 86, 172, 130), "AUTH PAGE", "#111111", "#111111", width=2, radius=8, font=FONT_SANS_BOLD(18), text_fill="white")
    return image


def make_complaint_flow() -> Image.Image:
    image, draw = new_canvas(1200, 1360)
    rounded_box(draw, (450, 20, 750, 92), "Start", "white", "#4ba600", radius=38, width=6, font=FONT_SANS_BOLD(26))
    arrow(draw, [(600, 92), (600, 156)])
    box(draw, (330, 156, 870, 234), "Open Report Issue Screen", "#71a3e2", "#2e74d4", font=FONT_SANS_BOLD(24))
    arrow(draw, [(600, 234), (600, 310)])
    box(draw, (300, 310, 900, 392), "Select Category and Enter Description", "#2f78d7", "#1750a7", font=FONT_SANS_BOLD(24), text_fill="white")
    arrow(draw, [(600, 392), (600, 470)])
    diamond(draw, 600, 530, 260, 130, "Save offline?", FONT_MONO_BOLD(22))

    label(draw, 335, 505, "Yes", FONT_SANS_BOLD(20))
    arrow(draw, [(470, 530), (250, 530), (250, 650)])
    box(draw, (110, 650, 390, 726), "Queue Local Complaint", "#8f89ef", "#6155ea", font=FONT_MONO_BOLD(22), text_fill="white")
    line(draw, [(250, 726), (250, 1270), (600, 1270)])

    label(draw, 750, 505, "No", FONT_SANS_BOLD(20))
    arrow(draw, [(730, 530), (930, 530), (930, 650)])
    box(draw, (760, 650, 1100, 726), "Validate and check\nclientRequestId", "#71aef4", "#2e74d4", font=FONT_MONO_BOLD(20))
    arrow(draw, [(930, 726), (930, 814)])
    box(draw, (760, 814, 1100, 890), "Resolve location and find\ndistrict", "#23beb3", "#108d84", font=FONT_MONO_BOLD(20))
    arrow(draw, [(930, 890), (930, 978)])
    box(draw, (795, 978, 1065, 1054), "Save Complaint\nRecord", "#1b9f99", "#106d68", font=FONT_MONO_BOLD(22), text_fill="white")
    arrow(draw, [(930, 1054), (930, 1148)])
    box(draw, (735, 1148, 1125, 1238), "Create notification event and\nqueue delivery", "#d8cca7", "#9f8d5a", font=FONT_MONO_BOLD(20))
    line(draw, [(930, 1238), (930, 1270), (600, 1270)])
    rounded_box(draw, (450, 1270, 750, 1340), "End", "white", "#ef2323", radius=34, width=6, font=FONT_SANS_BOLD(24))
    return image


def make_complaint_ui() -> Image.Image:
    image, draw = new_canvas(980, 710)
    phone_frame(draw, (170, 26, 810, 676), "Report Issue")
    for x1, x2, text in [(225, 335, "Water"), (350, 460, "Roads"), (475, 605, "Lighting"), (620, 730, "Waste")]:
        box(draw, (x1, 120, x2, 168), text, "#eef4ff" if text != "Water" else "#d9e7ff", "#2d74d3", width=3, radius=10, font=FONT_SANS_BOLD(18))
    box(draw, (230, 196, 750, 366), "Describe the issue\n\nExample: Water leak near school gate", "white", "#2d74d3", width=3, radius=14, font=FONT_SANS_BOLD(20))
    box(draw, (230, 390, 750, 510), "Captured location\nLat / Lng + image upload readiness", "white", "#111111", width=2, radius=16, font=FONT_SANS_BOLD(18))
    rounded_box(draw, (305, 548, 520, 618), "Save Offline", "white", "#0f9d2b", radius=34, width=5, font=FONT_SANS_BOLD(22))
    rounded_box(draw, (540, 548, 730, 618), "Submit Now", "white", "#ef2323", radius=34, width=5, font=FONT_SANS_BOLD(22))
    return image


def make_notification_flow() -> Image.Image:
    image, draw = new_canvas(1200, 1520)
    rounded_box(draw, (445, 20, 755, 92), "Complaint Event", "white", "#4ba600", radius=38, width=6, font=FONT_SANS_BOLD(26))
    arrow(draw, [(600, 92), (600, 156)])
    box(draw, (390, 156, 810, 236), "Save Notification\nEvent Record", "#71a3e2", "#2e74d4", font=FONT_SANS_BOLD(24))
    arrow(draw, [(600, 236), (600, 318)])
    box(draw, (390, 318, 810, 398), "Enqueue Delivery Job", "#2f78d7", "#1750a7", font=FONT_SANS_BOLD(24), text_fill="white")
    arrow(draw, [(600, 398), (600, 480)])
    box(draw, (390, 480, 810, 560), "Worker Reserves Job", "#a7c5f0", "#5a8edf", font=FONT_SANS_BOLD(24))
    arrow(draw, [(600, 560), (600, 642)])
    box(draw, (390, 642, 810, 722), "Load Active\nUser Devices", "#23beb3", "#108d84", font=FONT_SANS_BOLD(22))
    arrow(draw, [(600, 722), (600, 800)])
    diamond(draw, 600, 860, 220, 120, "Devices found?", FONT_MONO_BOLD(22))

    label(draw, 330, 840, "No", FONT_SANS_BOLD(20))
    arrow(draw, [(490, 860), (250, 860), (250, 970)])
    box(draw, (110, 970, 390, 1050), "Mark no_devices\nand save status", "#d95dcc", "#b53aab", font=FONT_MONO_BOLD(20))

    label(draw, 760, 840, "Yes", FONT_SANS_BOLD(20))
    arrow(draw, [(710, 860), (930, 860), (930, 970)])
    box(draw, (790, 970, 1090, 1050), "Push / fallback\ndelivery attempt", "#ddd1aa", "#a28f55", font=FONT_MONO_BOLD(20))

    line(draw, [(250, 1050), (250, 1140), (930, 1140)])
    line(draw, [(930, 1050), (930, 1140)])
    box(draw, (395, 1140, 805, 1222), "Update delivery status, attempts,\nand timestamps", "#ffe34b", "#cfa800", font=FONT_MONO_BOLD(20))
    arrow(draw, [(600, 1222), (600, 1304)])
    box(draw, (395, 1304, 805, 1384), "Citizen refreshes Updates screen", "#a99b75", "#7a6d4f", font=FONT_MONO_BOLD(20), text_fill="white")
    arrow(draw, [(600, 1384), (600, 1456)])
    rounded_box(draw, (500, 1456, 700, 1510), "End", "white", "#ef2323", radius=28, width=6, font=FONT_SANS_BOLD(22))
    return image


def make_notification_ui() -> Image.Image:
    image, draw = new_canvas(980, 760)
    phone_frame(draw, (170, 24, 810, 724), "Updates")
    label(draw, 490, 118, "Status changes and complaint confirmations", FONT_SANS(18), anchor="ma")
    box(draw, (220, 165, 760, 291), "Complaint received\nYour report was saved and is waiting for district review.\njust now", "white", "#111111", width=2, radius=16, font=FONT_SANS_BOLD(19))
    box(draw, (220, 320, 760, 446), "Complaint status updated\nWater issue is now resolved.\n2 hr ago", "white", "#111111", width=2, radius=16, font=FONT_SANS_BOLD(19))
    box(draw, (220, 475, 760, 601), "Complaint status updated\nRoad repair request is now in progress.\n1 day ago", "white", "#111111", width=2, radius=16, font=FONT_SANS_BOLD(19))
    rounded_box(draw, (355, 645, 625, 689), "Pull to refresh / Reload", "white", "#2d74d3", radius=22, width=4, font=FONT_SANS_BOLD(16))
    return image


def make_erd() -> Image.Image:
    image, draw = new_canvas(1120, 590)
    label(draw, 56, 34, "Entity Relationship Diagram", FONT_SANS_BOLD(28))
    box(draw, (80, 96, 300, 244), "USERS\nid (PK)\nemail / phone\nfullName\nrole\ndistrictId", "#bcd0f0", "#2d74d3", font=FONT_MONO_BOLD(18))
    box(draw, (420, 86, 670, 274), "COMPLAINTS\nid (PK)\ndescription\ncategory\nstatus\ndistrictId (FK)\ncreatedById (FK)", "#ffe34b", "#cfa800", font=FONT_MONO_BOLD(17))
    box(draw, (820, 102, 1040, 240), "DISTRICTS\nid (PK)\nname\nboundary", "#a9c8f2", "#5a8edf", font=FONT_MONO_BOLD(18))
    box(draw, (90, 360, 310, 508), "USER_DEVICES\nid (PK)\nuserId (FK)\nplatform\nfcmToken", "#d95dcc", "#b53aab", font=FONT_MONO_BOLD(18))
    box(draw, (420, 346, 670, 530), "NOTIFICATION_EVENTS\nid (PK)\nuserId (FK)\ncomplaintId (FK)\ntitle\ndeliveryStatus", "#2fb8b0", "#108d84", font=FONT_MONO_BOLD(17))
    box(draw, (820, 372, 1040, 510), "QUEUE_JOBS\nid (PK)\ntype\nstatus\npayload", "#ddd1aa", "#a28f55", font=FONT_MONO_BOLD(18))

    arrow(draw, [(300, 170), (420, 170)])
    label(draw, 330, 138, "creates many", FONT_SANS_BOLD(15))
    arrow(draw, [(670, 170), (820, 170)])
    label(draw, 705, 138, "belongs to one", FONT_SANS_BOLD(15))
    arrow(draw, [(190, 244), (190, 360)])
    label(draw, 108, 292, "owns many", FONT_SANS_BOLD(15))
    arrow(draw, [(545, 274), (545, 346)])
    label(draw, 450, 304, "triggers many", FONT_SANS_BOLD(15))
    arrow(draw, [(310, 432), (420, 432)])
    label(draw, 322, 398, "notifies", FONT_SANS_BOLD(15))
    arrow(draw, [(670, 432), (820, 432)])
    label(draw, 704, 398, "queues delivery", FONT_SANS_BOLD(15))
    return image


DIAGRAMS = {
    "mycity_org_chart.png": make_org_chart,
    "mycity_auth_flow.png": make_auth_flow,
    "mycity_auth_ui.png": make_auth_ui,
    "mycity_complaint_flow.png": make_complaint_flow,
    "mycity_complaint_ui.png": make_complaint_ui,
    "mycity_notification_flow.png": make_notification_flow,
    "mycity_notification_ui.png": make_notification_ui,
    "mycity_erd.png": make_erd,
}


def build_images() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for filename, builder in DIAGRAMS.items():
        image = builder()
        image.save(MEDIA_DIR / filename, format="PNG")


def pack_docx() -> None:
    output_docx = OUTPUT_DOCX
    if output_docx.exists():
        for candidate in [
            OUTPUT_DOCX,
            OUTPUT_DOCX.with_name("MyCity_Chapter_Four_Final_v2.docx"),
            OUTPUT_DOCX.with_name("MyCity_Chapter_Four_Final_v3.docx"),
            OUTPUT_DOCX.with_name("MyCity_Chapter_Four_Complete.docx"),
        ]:
            try:
                if candidate.exists():
                    candidate.unlink()
                output_docx = candidate
                break
            except PermissionError:
                continue

    output_docx.parent.mkdir(parents=True, exist_ok=True)
    zip_path = output_docx.with_suffix(".zip")
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file in PACKAGE_ROOT.rglob("*"):
            if file.is_file():
                zf.write(file, file.relative_to(PACKAGE_ROOT))
    shutil.move(str(zip_path), str(output_docx))
    return output_docx


def main() -> None:
    build_images()
    patch_document_xml()
    output_docx = pack_docx()
    print(f"Created {output_docx}")


if __name__ == "__main__":
    main()
