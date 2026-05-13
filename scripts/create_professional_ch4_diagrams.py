from __future__ import annotations

from pathlib import Path
import math
import textwrap

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(r"C:\Users\xamse\OneDrive\Desktop\hamze.apps\my-city")
OUT = ROOT / "output" / "figures" / "chapter4"
OUT.mkdir(parents=True, exist_ok=True)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts") / name,
        Path(r"C:\Windows\Fonts") / "segoeui.ttf",
        Path(r"C:\Windows\Fonts") / "arial.ttf",
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


F_TITLE = lambda s: font("arialbd.ttf", s)
F_SUB = lambda s: font("arial.ttf", s)
F_BODY = lambda s: font("arial.ttf", s)
F_BOLD = lambda s: font("arialbd.ttf", s)


PALETTE = {
    "bg": "#F6F8FC",
    "panel": "#FFFFFF",
    "ink": "#152033",
    "muted": "#64748B",
    "line": "#A9B7CC",
    "shadow": "#C7D2E4",
    "blue": "#2F6FED",
    "blue_soft": "#EAF1FF",
    "green": "#1FA971",
    "green_soft": "#E8FBF3",
    "violet": "#7C4DFF",
    "violet_soft": "#F0EAFE",
    "amber": "#E8A317",
    "amber_soft": "#FFF4D8",
    "rose": "#E64D7A",
    "rose_soft": "#FDEAF0",
    "teal": "#11A7A0",
    "teal_soft": "#E5FAF8",
    "slate": "#334155",
}


def new_canvas(width: int, height: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (width, height), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    return image, draw


def rounded_panel(
    image: Image.Image,
    xy: tuple[int, int, int, int],
    fill: str = PALETTE["panel"],
    outline: str | None = None,
    width: int = 1,
    radius: int = 24,
    shadow: bool = True,
) -> ImageDraw.ImageDraw:
    x1, y1, x2, y2 = xy
    if shadow:
        shadow_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow_layer)
        sdraw.rounded_rectangle((x1 + 8, y1 + 10, x2 + 8, y2 + 10), radius=radius, fill=(30, 41, 59, 26))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(10))
        image.alpha_composite(shadow_layer)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    return draw


def text(draw: ImageDraw.ImageDraw, x: int, y: int, value: str, font_obj, fill: str = PALETTE["ink"], anchor: str = "la") -> None:
    draw.text((x, y), value, font=font_obj, fill=fill, anchor=anchor)


def multiline_center(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], value: str, font_obj, fill: str = PALETTE["ink"], spacing: int = 6) -> None:
    x1, y1, x2, y2 = box
    bbox = draw.multiline_textbbox((0, 0), value, font=font_obj, spacing=spacing, align="center")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = x1 + ((x2 - x1) - tw) / 2
    ty = y1 + ((y2 - y1) - th) / 2
    draw.multiline_text((tx, ty), value, font=font_obj, fill=fill, spacing=spacing, align="center")


def wrap_text(value: str, width: int) -> str:
    return "\n".join(textwrap.wrap(value, width=width))


def header(draw: ImageDraw.ImageDraw, section_no: str, title_value: str, subtitle: str) -> None:
    title_size = 34
    if len(title_value) > 46:
        title_size = 22
    elif len(title_value) > 32:
        title_size = 28
    draw.rounded_rectangle((60, 44, 210, 98), radius=16, fill=PALETTE["blue_soft"])
    text(draw, 135, 71, section_no, F_BOLD(22), PALETTE["blue"], "mm")
    text(draw, 60, 142, title_value, F_TITLE(title_size), PALETTE["ink"], "la")
    text(draw, 60, 182, subtitle, F_SUB(18), PALETTE["muted"], "la")


def badge(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], label: str, fill: str, ink: str) -> None:
    draw.rounded_rectangle(xy, radius=16, fill=fill)
    multiline_center(draw, xy, label, F_BOLD(18), ink)


def node(image: Image.Image, xy: tuple[int, int, int, int], label: str, fill: str, outline: str, title_fill: str | None = None, title: str | None = None, ink: str = PALETTE["ink"], font_size: int = 24) -> None:
    draw = rounded_panel(image, xy, fill=fill, outline=outline, width=2, radius=24, shadow=True)
    x1, y1, x2, y2 = xy
    if title and title_fill:
        draw.rounded_rectangle((x1, y1, x2, y1 + 38), radius=24, fill=title_fill)
        draw.rectangle((x1, y1 + 18, x2, y1 + 38), fill=title_fill)
        text(draw, x1 + 18, y1 + 19, title, F_BOLD(16), "#FFFFFF", "la")
        multiline_center(draw, (x1 + 14, y1 + 52, x2 - 14, y2 - 12), label, F_BOLD(font_size), ink)
    else:
        multiline_center(draw, (x1 + 12, y1 + 10, x2 - 12, y2 - 10), label, F_BOLD(font_size), ink)


def terminal(image: Image.Image, xy: tuple[int, int, int, int], label: str, accent: str) -> None:
    draw = rounded_panel(image, xy, fill="#FFFFFF", outline=accent, width=4, radius=36, shadow=True)
    multiline_center(draw, xy, label, F_BOLD(24), PALETTE["ink"])


def decision(image: Image.Image, cx: int, cy: int, w: int, h: int, label_value: str) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(layer)
    pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
    shifted = [(x + 7, y + 8) for x, y in pts]
    sdraw.polygon(shifted, fill=(30, 41, 59, 28))
    layer = layer.filter(ImageFilter.GaussianBlur(8))
    image.alpha_composite(layer)
    draw = ImageDraw.Draw(image)
    draw.polygon(pts, fill="#FFFFFF", outline=PALETTE["slate"], width=3)
    multiline_center(draw, (cx - w // 2 + 8, cy - h // 2 + 8, cx + w // 2 - 8, cy + h // 2 - 8), label_value, F_BOLD(22))


def arrow(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: str = PALETTE["slate"], width: int = 6, head: int = 14) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")
    (x1, y1), (x2, y2) = points[-2], points[-1]
    ang = math.atan2(y2 - y1, x2 - x1)
    left = (x2 - head * math.cos(ang - math.pi / 6), y2 - head * math.sin(ang - math.pi / 6))
    right = (x2 - head * math.cos(ang + math.pi / 6), y2 - head * math.sin(ang + math.pi / 6))
    draw.polygon([(x2, y2), left, right], fill=fill)


def label_on_line(draw: ImageDraw.ImageDraw, x: int, y: int, label_value: str) -> None:
    draw.rounded_rectangle((x - 28, y - 16, x + 34, y + 16), radius=12, fill="#FFFFFF")
    text(draw, x + 2, y, label_value, F_BOLD(18), PALETTE["ink"], "mm")


def export(image: Image.Image, filename: str) -> None:
    rgb = image.convert("RGB")
    rgb.save(OUT / filename, quality=96)


def make_org_chart() -> None:
    image, draw = new_canvas(1800, 1120)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    text(draw, 80, 78, "Organizational Chart", F_TITLE(40), PALETTE["ink"], "la")

    terminal(image, (700, 100, 1110, 196), "Mayor", PALETTE["rose"])
    node(image, (610, 300, 1200, 420), "City Administrator", "#FFFFFF", PALETTE["green"], font_size=30)
    node(image, (130, 600, 560, 720), "Citizen Users", PALETTE["violet_soft"], PALETTE["violet"], font_size=28)
    node(image, (660, 600, 1140, 720), "District Administrators", PALETTE["blue_soft"], PALETTE["blue"], font_size=28)
    node(image, (1240, 600, 1670, 720), "System Administrator", "#FFFFFF", PALETTE["blue"], font_size=28)

    draw.line([(905, 196), (905, 300)], fill=PALETTE["rose"], width=8)
    draw.line([(905, 420), (905, 500)], fill=PALETTE["slate"], width=8)
    draw.line([(345, 500), (1455, 500)], fill=PALETTE["slate"], width=8)
    draw.line([(345, 500), (345, 600)], fill=PALETTE["slate"], width=8)
    draw.line([(900, 500), (900, 600)], fill=PALETTE["slate"], width=8)
    draw.line([(1455, 500), (1455, 600)], fill=PALETTE["slate"], width=8)

    feature_panel = rounded_panel(image, (70, 830, 1730, 1030), fill="#FFFFFF", radius=28, shadow=True)
    cols = [
        ("Mayor", "Executive leadership and city-level service direction"),
        ("City Administrator", "Coordinates administration and supervises service performance"),
        ("District Administrators", "Handle district complaints, updates, and local response follow-up"),
        ("System Administrator", "Maintains platform access, security, and technical operations"),
        ("Citizen Users", "Create accounts, report issues, and track service progress"),
    ]
    xs = [120, 440, 760, 1080, 1400]
    for (title_value, body), x in zip(cols, xs):
        text(feature_panel, x, 878, title_value, F_BOLD(18), PALETTE["ink"], "la")
        text(feature_panel, x, 918, wrap_text(body, 22), F_SUB(16), PALETTE["muted"], "la")
    export(image, "Figure_4_1_1_Organizational_Chart_Revised.png")


def make_auth_flow() -> None:
    image, draw = new_canvas(1700, 1680)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    text(draw, 70, 78, "User Registration and Login Flow", F_TITLE(34), PALETTE["ink"], "la")
    terminal(image, (700, 90, 1000, 168), "Start", PALETTE["blue"])
    node(image, (540, 230, 1160, 330), "Open Login / Register Screen", "#FFFFFF", PALETTE["blue"], font_size=24)
    decision(image, 850, 440, 360, 180, "Choose action")
    draw = ImageDraw.Draw(image)
    arrow(draw, [(850, 168), (850, 230)])
    arrow(draw, [(850, 330), (850, 350)])

    left_x1, left_x2 = 140, 560
    right_x1, right_x2 = 1140, 1560
    node(image, (left_x1, 610, left_x2, 700), "Enter full name, email,\nphone, and password", PALETTE["violet_soft"], PALETTE["violet"], font_size=22)
    node(image, (left_x1, 785, left_x2, 875), "Validate input", PALETTE["green_soft"], PALETTE["green"], font_size=22)
    decision(image, 350, 985, 250, 150, "Valid?")
    node(image, (20, 1125, 190, 1205), "Show error", PALETTE["rose_soft"], PALETTE["rose"], font_size=20)
    node(image, (20, 1280, 230, 1365), "Re-enter data", PALETTE["amber_soft"], PALETTE["amber"], font_size=20)
    node(image, (240, 1125, 460, 1205), "Save user record", PALETTE["blue_soft"], PALETTE["blue"], font_size=20)
    node(image, (220, 1280, 480, 1365), "Success message", PALETTE["green_soft"], PALETTE["green"], font_size=20)

    node(image, (right_x1, 610, right_x2, 700), "Enter email or phone\nand password", PALETTE["blue_soft"], PALETTE["blue"], font_size=22)
    node(image, (right_x1, 785, right_x2, 875), "Validate credentials", PALETTE["green_soft"], PALETTE["green"], font_size=22)
    decision(image, 1350, 985, 250, 150, "Valid?")
    node(image, (1510, 1125, 1680, 1205), "Show error", PALETTE["rose_soft"], PALETTE["rose"], font_size=20)
    node(image, (1470, 1280, 1680, 1365), "Re-enter login", PALETTE["amber_soft"], PALETTE["amber"], font_size=20)
    node(image, (1240, 1125, 1460, 1205), "Create session", PALETTE["blue_soft"], PALETTE["blue"], font_size=20)
    node(image, (1195, 1280, 1505, 1365), "Redirect to home map", PALETTE["green_soft"], PALETTE["green"], font_size=20)

    arrow(draw, [(670, 440), (350, 440), (350, 610)])
    arrow(draw, [(1030, 440), (1350, 440), (1350, 610)])
    label_on_line(draw, 520, 405, "Register")
    label_on_line(draw, 1180, 405, "Login")

    arrow(draw, [(350, 700), (350, 785)])
    arrow(draw, [(350, 875), (350, 910)])
    arrow(draw, [(350, 1060), (350, 1125)])
    label_on_line(draw, 470, 950, "Yes")
    arrow(draw, [(225, 985), (105, 985), (105, 1125)])
    label_on_line(draw, 155, 950, "No")
    arrow(draw, [(350, 1205), (350, 1280)])
    arrow(draw, [(105, 1205), (105, 1280)])
    arrow(draw, [(125, 1322), (125, 655), (20, 655)])

    arrow(draw, [(1350, 700), (1350, 785)])
    arrow(draw, [(1350, 875), (1350, 910)])
    arrow(draw, [(1350, 1060), (1350, 1125)])
    label_on_line(draw, 1230, 950, "Yes")
    arrow(draw, [(1475, 985), (1595, 985), (1595, 1125)])
    label_on_line(draw, 1545, 950, "No")
    arrow(draw, [(1350, 1205), (1350, 1280)])
    arrow(draw, [(1595, 1205), (1595, 1280)])
    arrow(draw, [(1680, 1322), (1695, 1322), (1695, 655), (1560, 655)])

    draw.line([(350, 1365), (350, 1495), (1350, 1495), (1350, 1365)], fill=PALETTE["slate"], width=6)
    terminal(image, (730, 1510, 970, 1582), "End", PALETTE["blue"])
    draw.line([(850, 1495), (850, 1510)], fill=PALETTE["slate"], width=6)
    export(image, "Figure_4_2_1_2_User_Registration_Login_Logical_Design_Revised.png")


def phone_mockup(image: Image.Image, xy: tuple[int, int, int, int], title_value: str) -> None:
    draw = rounded_panel(image, xy, fill="#FFFFFF", outline="#1E293B", width=3, radius=42, shadow=True)
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle((x1 + 180, y1 + 18, x2 - 180, y1 + 36), radius=8, fill="#111827")
    text(draw, (x1 + x2) // 2, y1 + 80, title_value, F_TITLE(28), PALETTE["ink"], "mm")


def field(image: Image.Image, xy: tuple[int, int, int, int], label_value: str, accent: str = PALETTE["line"]) -> None:
    draw = rounded_panel(image, xy, fill="#FFFFFF", outline=accent, width=2, radius=18, shadow=False)
    text(draw, xy[0] + 22, (xy[1] + xy[3]) // 2, label_value, F_SUB(20), PALETTE["muted"], "lm")


def button(image: Image.Image, xy: tuple[int, int, int, int], label_value: str, fill: str, ink: str = "#FFFFFF", outline: str | None = None) -> None:
    draw = rounded_panel(image, xy, fill=fill, outline=outline, width=2 if outline else 0, radius=22, shadow=True)
    multiline_center(draw, xy, label_value, F_BOLD(20), ink)


def make_auth_ui(filename: str, section_no: str, title_value: str) -> None:
    image, draw = new_canvas(1300, 960)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    header(draw, section_no, title_value, "Professional mobile interface presentation for chapter documentation.")
    phone_mockup(image, (340, 170, 960, 900), "MyCity")
    text(draw, 650, 290, "Create account or sign in", F_SUB(22), PALETTE["muted"], "mm")
    field(image, (420, 340, 880, 412), "Full name")
    field(image, (420, 442, 880, 514), "Email or phone")
    field(image, (420, 544, 880, 616), "Password")
    button(image, (430, 670, 870, 742), "Create account / Sign in", PALETTE["blue"])
    button(image, (510, 772, 790, 828), "Switch mode", "#FFFFFF", PALETTE["blue"], PALETTE["blue"])
    badge(draw, (90, 350, 250, 410), "AUTH", PALETTE["blue_soft"], PALETTE["blue"])
    feature = rounded_panel(image, (70, 640, 300, 860), fill="#FFFFFF", radius=26, shadow=True)
    text(feature, 100, 685, "Design Notes", F_BOLD(18), PALETTE["ink"], "la")
    text(feature, 100, 725, wrap_text("Single screen mode switch, low-friction inputs, clear primary action.", 18), F_SUB(16), PALETTE["muted"], "la")
    export(image, filename)


def make_complaint_flow() -> None:
    image, draw = new_canvas(1600, 1680)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    header(draw, "4.2.2.2", "Logical Design: Complaint Reporting", "Core issue-reporting flow with offline save and district routing.")
    terminal(image, (650, 90, 950, 170), "Start", PALETTE["green"])
    node(image, (470, 250, 1130, 360), "Open Report Issue Screen", "#FFFFFF", PALETTE["blue"], PALETTE["blue"], "Entry")
    node(image, (430, 440, 1170, 560), "Select category and enter description", PALETTE["blue_soft"], PALETTE["blue"], PALETTE["blue"], "Input")
    decision(image, 800, 700, 330, 180, "Save offline?")
    arrow(draw, [(800, 170), (800, 250)])
    arrow(draw, [(800, 360), (800, 440)])
    arrow(draw, [(800, 560), (800, 610)])
    node(image, (120, 780, 520, 890), "Queue local complaint", PALETTE["violet_soft"], PALETTE["violet"], PALETTE["violet"], "Offline Path")
    arrow(draw, [(635, 700), (320, 700), (320, 780)])
    label_on_line(draw, 525, 665, "Yes")
    node(image, (980, 780, 1470, 890), "Validate and check clientRequestId", "#FFFFFF", PALETTE["blue"], PALETTE["blue"], "Validation", font_size=22)
    arrow(draw, [(965, 700), (1225, 700), (1225, 780)])
    label_on_line(draw, 1020, 665, "No")
    node(image, (1030, 980, 1420, 1090), "Resolve location and\nfind district", PALETTE["teal_soft"], PALETTE["teal"], PALETTE["teal"], "Routing", font_size=22)
    node(image, (1090, 1180, 1360, 1290), "Save complaint record", PALETTE["green_soft"], PALETTE["green"], PALETTE["green"], "Persist", font_size=22)
    node(image, (930, 1380, 1520, 1495), "Create notification event\nand queue delivery", PALETTE["amber_soft"], PALETTE["amber"], PALETTE["amber"], "Async Work", font_size=22)
    arrow(draw, [(1225, 890), (1225, 980)])
    arrow(draw, [(1225, 1090), (1225, 1180)])
    arrow(draw, [(1225, 1290), (1225, 1380)])
    draw.line([(320, 890), (320, 1560), (1225, 1560), (1225, 1495)], fill=PALETTE["slate"], width=7)
    terminal(image, (690, 1570, 910, 1640), "End", PALETTE["green"])
    export(image, "Figure_4_2_2_2_Complaint_Reporting_Logical_Design.png")


def make_complaint_flow_revised() -> None:
    image = Image.new("RGBA", (1700, 1200), "#FAFCFF")
    draw = ImageDraw.Draw(image)

    # light dotted background like the user's sample
    for y in range(0, 1200, 28):
        for x in range(0, 1700, 28):
            draw.ellipse((x + 11, y + 11, x + 13, y + 13), fill="#D9E2EF")

    # simple title bar
    draw.rectangle((70, 55, 610, 125), fill="#53AEEA")
    text(draw, 95, 90, "Complaint Reporting Flowchart", F_TITLE(28), "#111111", "lm")

    # start
    draw.rounded_rectangle((930, 45, 1110, 120), radius=28, fill="#FFE680", outline="#FFE680")
    text(draw, 1020, 83, "Start", F_SUB(22), "#111111", "mm")

    # helper shapes
    def simple_box(x1, y1, x2, y2, label_value, fill="#8FD0FB"):
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill=fill, outline=fill)
        multiline_center(draw, (x1 + 10, y1 + 8, x2 - 10, y2 - 8), label_value, F_SUB(18), "#111111", spacing=4)

    def simple_diamond(cx, cy, w, h, label_value):
        pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
        draw.polygon(pts, fill="#83E29B", outline="#83E29B")
        multiline_center(draw, (cx - w // 2 + 12, cy - h // 2 + 10, cx + w // 2 - 12, cy + h // 2 - 10), label_value, F_SUB(20), "#111111")

    def small_label(x, y, label_value, fill):
        draw.ellipse((x - 42, y - 22, x + 42, y + 22), fill=fill, outline="#AAB4C3")
        text(draw, x, y, label_value, F_SUB(14), "#111111", "mm")

    def slim_arrow(points):
        arrow(draw, points, fill="#111111", width=2, head=8)

    simple_box(760, 160, 1280, 228, "Open Report Issue Screen")
    slim_arrow([(1020, 120), (1020, 160)])

    simple_box(700, 300, 1340, 372, "Select category, description,\nand location")
    slim_arrow([(1020, 228), (1020, 300)])

    simple_diamond(1020, 470, 250, 150, "Save\nOffline?")
    slim_arrow([(1020, 372), (1020, 395)])

    # left branch yes
    small_label(780, 430, "Yes", "#D5F8C8")
    slim_arrow([(895, 470), (520, 470), (520, 590)])
    simple_box(360, 590, 680, 660, "Queue Local Complaint")
    slim_arrow([(520, 660), (520, 770)])
    simple_box(340, 770, 700, 840, "Save for sync when\ninternet returns")

    # right branch no
    small_label(1260, 430, "No", "#FFD0D8")
    slim_arrow([(1145, 470), (1420, 470), (1420, 590)])
    simple_box(1220, 590, 1580, 660, "Validate Request")
    slim_arrow([(1400, 660), (1400, 770)])
    simple_box(1160, 770, 1640, 840, "Resolve location and\nfind district")
    slim_arrow([(1400, 840), (1400, 950)])
    simple_box(1220, 950, 1580, 1020, "Save Complaint Record")

    # merge to end
    draw.line([(520, 840), (520, 1115), (1020, 1115)], fill="#111111", width=2)
    draw.line([(1400, 1020), (1400, 1115), (1020, 1115)], fill="#111111", width=2)
    draw.rounded_rectangle((920, 1115, 1120, 1185), radius=28, fill="#FFE680", outline="#FFE680")
    text(draw, 1020, 1150, "End", F_SUB(22), "#111111", "mm")

    export(image, "Figure_4_2_2_2_Complaint_Reporting_Logical_Design_Revised.png")


def make_notification_flow_revised() -> None:
    image = Image.new("RGBA", (1700, 1280), "#FAFCFF")
    draw = ImageDraw.Draw(image)

    for y in range(0, 1280, 28):
        for x in range(0, 1700, 28):
            draw.ellipse((x + 11, y + 11, x + 13, y + 13), fill="#D9E2EF")

    draw.rectangle((70, 55, 610, 125), fill="#53AEEA")
    text(draw, 95, 90, "Notification Tracking Flowchart", F_TITLE(28), "#111111", "lm")

    def simple_box(x1, y1, x2, y2, label_value, fill="#8FD0FB"):
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill=fill, outline=fill)
        multiline_center(draw, (x1 + 10, y1 + 8, x2 - 10, y2 - 8), label_value, F_SUB(18), "#111111", spacing=4)

    def simple_diamond(cx, cy, w, h, label_value, fill="#83E29B"):
        pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
        draw.polygon(pts, fill=fill, outline=fill)
        multiline_center(draw, (cx - w // 2 + 12, cy - h // 2 + 10, cx + w // 2 - 12, cy + h // 2 - 10), label_value, F_SUB(20), "#111111")

    def small_label(x, y, label_value, fill):
        draw.ellipse((x - 42, y - 22, x + 42, y + 22), fill=fill, outline="#AAB4C3")
        text(draw, x, y, label_value, F_SUB(14), "#111111", "mm")

    def slim_arrow(points):
        arrow(draw, points, fill="#111111", width=2, head=8)

    draw.rounded_rectangle((930, 45, 1110, 120), radius=28, fill="#FFE680", outline="#FFE680")
    text(draw, 1020, 83, "Start", F_SUB(22), "#111111", "mm")

    simple_box(760, 160, 1280, 228, "Complaint Event", fill="#9DD7FF")
    slim_arrow([(1020, 120), (1020, 160)])

    simple_box(700, 300, 1340, 372, "Save Notification Event Record", fill="#8FD0FB")
    slim_arrow([(1020, 228), (1020, 300)])

    simple_box(760, 445, 1280, 513, "Enqueue Delivery Job", fill="#7FB8FF")
    slim_arrow([(1020, 372), (1020, 445)])

    simple_box(760, 590, 1280, 658, "Load Active User Devices", fill="#9FE7D5")
    slim_arrow([(1020, 513), (1020, 590)])

    simple_diamond(1020, 770, 250, 150, "Devices\nFound?", fill="#83E29B")
    slim_arrow([(1020, 658), (1020, 695)])

    small_label(780, 730, "No", "#FFD0D8")
    slim_arrow([(895, 770), (520, 770), (520, 885)])
    simple_box(335, 885, 705, 955, "Mark no_devices and save status", fill="#FFB4C4")

    small_label(1260, 730, "Yes", "#D5F8C8")
    slim_arrow([(1145, 770), (1420, 770), (1420, 885)])
    simple_box(1185, 885, 1605, 955, "Push / fallback delivery attempt", fill="#FFD88B")

    draw.line([(520, 955), (520, 1070), (1020, 1070)], fill="#111111", width=2)
    draw.line([(1420, 955), (1420, 1070), (1020, 1070)], fill="#111111", width=2)

    simple_box(720, 1070, 1320, 1140, "Update delivery status,\nattempts, and timestamps", fill="#8FE0A8")
    slim_arrow([(1020, 1140), (1020, 1210)])

    draw.rounded_rectangle((920, 1210, 1120, 1275), radius=28, fill="#FFE680", outline="#FFE680")
    text(draw, 1020, 1242, "End", F_SUB(22), "#111111", "mm")

    export(image, "Figure_4_2_3_2_Notification_Update_Logical_Design_Revised.png")


def make_auth_flow_revised_simple() -> None:
    image = Image.new("RGBA", (1700, 1320), "#FAFCFF")
    draw = ImageDraw.Draw(image)

    for y in range(0, 1320, 28):
        for x in range(0, 1700, 28):
            draw.ellipse((x + 11, y + 11, x + 13, y + 13), fill="#D9E2EF")

    draw.rectangle((70, 55, 610, 125), fill="#53AEEA")
    text(draw, 95, 90, "Authentication Flowchart", F_TITLE(28), "#111111", "lm")

    def simple_box(x1, y1, x2, y2, label_value, fill="#8FD0FB"):
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill=fill, outline=fill)
        multiline_center(draw, (x1 + 10, y1 + 8, x2 - 10, y2 - 8), label_value, F_SUB(18), "#111111", spacing=4)

    def simple_diamond(cx, cy, w, h, label_value, fill="#83E29B"):
        pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
        draw.polygon(pts, fill=fill, outline=fill)
        multiline_center(draw, (cx - w // 2 + 12, cy - h // 2 + 10, cx + w // 2 - 12, cy + h // 2 - 10), label_value, F_SUB(20), "#111111")

    def small_label(x, y, label_value, fill):
        draw.ellipse((x - 42, y - 22, x + 42, y + 22), fill=fill, outline="#AAB4C3")
        text(draw, x, y, label_value, F_SUB(14), "#111111", "mm")

    def slim_arrow(points):
        arrow(draw, points, fill="#111111", width=2, head=8)

    draw.rounded_rectangle((930, 45, 1110, 120), radius=28, fill="#FFE680", outline="#FFE680")
    text(draw, 1020, 83, "Start", F_SUB(22), "#111111", "mm")

    simple_box(760, 160, 1280, 228, "Open Login / Register Screen")
    slim_arrow([(1020, 120), (1020, 160)])

    simple_diamond(1020, 350, 260, 160, "Choose\nAction")
    slim_arrow([(1020, 228), (1020, 275)])

    # register branch
    small_label(780, 310, "Register", "#EEF2F7")
    slim_arrow([(890, 350), (520, 350), (520, 470)])
    simple_box(300, 470, 650, 550, "Enter full name,\nemail, phone,\nand password")
    slim_arrow([(475, 550), (475, 625)])
    simple_box(365, 625, 585, 685, "Validate input")
    slim_arrow([(475, 685), (475, 735)])
    simple_diamond(475, 825, 160, 120, "Valid?")
    small_label(360, 785, "No", "#FFD0D8")
    slim_arrow([(395, 825), (250, 825), (250, 920)])
    simple_box(150, 920, 350, 980, "Show error", fill="#FFB4C4")
    slim_arrow([(250, 980), (250, 1060)])
    simple_box(135, 1060, 380, 1125, "Re-enter data", fill="#FFD88B")
    draw.line([(135, 1092), (110, 1092), (110, 510), (300, 510)], fill="#111111", width=2)

    small_label(590, 785, "Yes", "#D5F8C8")
    slim_arrow([(555, 825), (650, 825), (650, 920)])
    simple_box(545, 920, 770, 980, "Save user record")
    slim_arrow([(650, 980), (650, 1060)])
    simple_box(515, 1060, 785, 1125, "Success message", fill="#8FE0A8")

    # login branch
    small_label(1260, 310, "Login", "#EEF2F7")
    slim_arrow([(1150, 350), (1420, 350), (1420, 470)])
    simple_box(1120, 470, 1520, 550, "Enter email or phone number\nand password")
    slim_arrow([(1320, 550), (1320, 625)])
    simple_box(1185, 625, 1455, 685, "Validate credentials")
    slim_arrow([(1320, 685), (1320, 735)])
    simple_diamond(1320, 825, 160, 120, "Valid?")
    small_label(1205, 785, "Yes", "#D5F8C8")
    slim_arrow([(1240, 825), (1145, 825), (1145, 920)])
    simple_box(1060, 920, 1260, 980, "Create session")
    slim_arrow([(1160, 980), (1160, 1060)])
    simple_box(1020, 1060, 1310, 1125, "Redirect to home map", fill="#8FE0A8")

    small_label(1435, 785, "No", "#FFD0D8")
    slim_arrow([(1400, 825), (1500, 825), (1500, 920)])
    simple_box(1410, 920, 1610, 980, "Show error", fill="#FFB4C4")
    slim_arrow([(1510, 980), (1510, 1060)])
    simple_box(1380, 1060, 1630, 1125, "Re-enter login", fill="#FFD88B")
    draw.line([(1630, 1092), (1660, 1092), (1660, 510), (1520, 510)], fill="#111111", width=2)

    # end
    draw.line([(650, 1125), (650, 1220), (1160, 1220), (1160, 1125)], fill="#111111", width=2)
    draw.rounded_rectangle((910, 1220, 1130, 1288), radius=28, fill="#FFE680", outline="#FFE680")
    text(draw, 1020, 1254, "End", F_SUB(22), "#111111", "mm")

    export(image, "Figure_4_2_1_2_User_Registration_Login_Logical_Design_Revised_v2.png")


def make_complaint_ui(filename: str, section_no: str, title_value: str) -> None:
    image, draw = new_canvas(1300, 1000)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    header(draw, section_no, title_value, "Citizen issue-reporting interface with practical medium project scope.")
    phone_mockup(image, (300, 170, 1000, 930), "Report Issue")
    chips = [
        (370, 280, 480, 332, "Water", PALETTE["blue_soft"], PALETTE["blue"]),
        (500, 280, 620, 332, "Roads", "#FFFFFF", PALETTE["line"]),
        (640, 280, 790, 332, "Lighting", "#FFFFFF", PALETTE["line"]),
        (810, 280, 930, 332, "Waste", "#FFFFFF", PALETTE["line"]),
    ]
    for x1, y1, x2, y2, label_value, fill, outline in chips:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill=fill, outline=outline, width=2)
        text(draw, (x1 + x2) // 2, (y1 + y2) // 2, label_value, F_BOLD(18), PALETTE["blue"] if outline == PALETTE["blue"] else PALETTE["ink"], "mm")
    draw.rounded_rectangle((370, 370, 930, 560), radius=20, fill="#FFFFFF", outline=PALETTE["line"], width=2)
    text(draw, 400, 405, "Describe the issue", F_BOLD(18), PALETTE["ink"], "la")
    text(draw, 400, 455, "Example: Water leak near school gate", F_SUB(18), PALETTE["muted"], "la")
    draw.rounded_rectangle((370, 595, 930, 700), radius=20, fill="#FFFFFF", outline=PALETTE["line"], width=2)
    text(draw, 400, 632, "Captured location", F_BOLD(18), PALETTE["ink"], "la")
    text(draw, 400, 670, "Lat / Lng with media upload readiness", F_SUB(16), PALETTE["muted"], "la")
    button(image, (400, 760, 610, 828), "Save Offline", "#FFFFFF", PALETTE["green"], PALETTE["green"])
    button(image, (640, 760, 900, 828), "Submit Now", PALETTE["blue"])
    export(image, filename)


def make_notification_flow() -> None:
    image, draw = new_canvas(1600, 1760)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    header(draw, "4.2.3.2", "Notification Delivery Flow", "Asynchronous notification delivery from event creation to citizen update view.")
    terminal(image, (610, 90, 990, 170), "Complaint Event", PALETTE["green"])
    node(image, (470, 250, 1130, 360), "Save notification event record", "#FFFFFF", PALETTE["blue"], PALETTE["blue"], "Persist")
    node(image, (520, 430, 1080, 540), "Enqueue delivery job", PALETTE["blue_soft"], PALETTE["blue"], PALETTE["blue"], "Queue")
    node(image, (540, 610, 1060, 720), "# Worker reserves job", "#FFFFFF", PALETTE["line"], PALETTE["line"], "Worker")
    node(image, (470, 790, 1130, 905), "Load active user devices", PALETTE["teal_soft"], PALETTE["teal"], PALETTE["teal"], "Lookup")
    decision(image, 800, 1045, 330, 180, "Devices found?")
    node(image, (110, 1165, 510, 1280), "Mark no_devices\nand save status", PALETTE["rose_soft"], PALETTE["rose"], PALETTE["rose"], "No Device Path", font_size=22)
    node(image, (1060, 1165, 1490, 1280), "Push or fallback\ndelivery attempt", PALETTE["amber_soft"], PALETTE["amber"], PALETTE["amber"], "Delivery Path", font_size=22)
    node(image, (500, 1410, 1100, 1525), "Update delivery status,\nattempts, and timestamps", PALETTE["green_soft"], PALETTE["green"], PALETTE["green"], "Update Record", font_size=22)
    node(image, (520, 1600, 1080, 1710), "Citizen refreshes Updates screen", "#FFFFFF", PALETTE["blue"], PALETTE["blue"], "User View", font_size=22)
    terminal(image, (700, 1720, 900, 1790), "End", PALETTE["green"])
    arrow(draw, [(800, 170), (800, 250)])
    arrow(draw, [(800, 360), (800, 430)])
    arrow(draw, [(800, 540), (800, 610)])
    arrow(draw, [(800, 720), (800, 790)])
    arrow(draw, [(800, 905), (800, 955)])
    arrow(draw, [(635, 1045), (310, 1045), (310, 1165)])
    label_on_line(draw, 520, 1010, "No")
    arrow(draw, [(965, 1045), (1275, 1045), (1275, 1165)])
    label_on_line(draw, 1035, 1010, "Yes")
    draw.line([(310, 1280), (310, 1468), (500, 1468)], fill=PALETTE["slate"], width=7)
    draw.line([(1275, 1280), (1275, 1468), (1100, 1468)], fill=PALETTE["slate"], width=7)
    arrow(draw, [(800, 1525), (800, 1600)])
    arrow(draw, [(800, 1710), (800, 1720)])
    export(image, "Figure_4_2_3_2_Notification_Update_Logical_Design.png")


def make_notification_ui(filename: str, section_no: str, title_value: str) -> None:
    image, draw = new_canvas(1300, 1040)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    header(draw, section_no, title_value, "Citizen-facing updates screen with clear progress messages and timestamps.")
    phone_mockup(image, (300, 150, 1000, 960), "Updates")
    text(draw, 650, 270, "Status changes and complaint confirmations", F_SUB(20), PALETTE["muted"], "mm")
    cards = [
        ("Complaint received", "Your report was saved and is waiting for district review.", "just now"),
        ("Complaint status updated", "Water issue is now resolved.", "2 hr ago"),
        ("Complaint status updated", "Road repair request is now in progress.", "1 day ago"),
    ]
    y = 340
    for title_card, body, time_value in cards:
        rounded_panel(image, (390, y, 910, y + 130), fill="#FFFFFF", outline=PALETTE["line"], radius=20, shadow=True)
        draw = ImageDraw.Draw(image)
        text(draw, 650, y + 36, title_card, F_BOLD(20), PALETTE["ink"], "mm")
        text(draw, 650, y + 70, body, F_SUB(18), PALETTE["slate"], "mm")
        text(draw, 650, y + 100, time_value, F_SUB(16), PALETTE["muted"], "mm")
        y += 158
    button(image, (500, 860, 800, 918), "Pull to refresh / Reload", "#FFFFFF", PALETTE["blue"], PALETTE["blue"])
    export(image, filename)


def make_erd() -> None:
    image, draw = new_canvas(1700, 980)
    image = image.convert("RGBA")
    draw = ImageDraw.Draw(image)
    header(draw, "4.3", "Entity Relationship Diagram", "Simplified backend entities supporting complaints, routing, notifications, and delivery jobs.")
    node(image, (120, 260, 430, 470), "USERS\nid (PK)\nemail / phone\nfullName\nrole\ndistrictId", PALETTE["blue_soft"], PALETTE["blue"], PALETTE["blue"], "Entity", font_size=22)
    node(image, (660, 220, 1020, 500), "COMPLAINTS\nid (PK)\ndescription\ncategory\nstatus\ndistrictId (FK)\ncreatedById (FK)", PALETTE["amber_soft"], PALETTE["amber"], PALETTE["amber"], "Entity", font_size=20)
    node(image, (1260, 260, 1540, 450), "DISTRICTS\nid (PK)\nname\nboundary", PALETTE["green_soft"], PALETTE["green"], PALETTE["green"], "Entity", font_size=22)
    node(image, (140, 620, 450, 840), "USER_DEVICES\nid (PK)\nuserId (FK)\nplatform\nfcmToken", PALETTE["violet_soft"], PALETTE["violet"], PALETTE["violet"], "Entity", font_size=22)
    node(image, (650, 610, 1050, 860), "NOTIFICATION_EVENTS\nid (PK)\nuserId (FK)\ncomplaintId (FK)\ntitle\ndeliveryStatus", PALETTE["teal_soft"], PALETTE["teal"], PALETTE["teal"], "Entity", font_size=19)
    node(image, (1260, 640, 1550, 820), "QUEUE_JOBS\nid (PK)\ntype\nstatus\npayload", "#FFFFFF", PALETTE["line"], PALETTE["line"], "Entity", font_size=22)
    arrow(draw, [(430, 365), (660, 365)])
    text(draw, 545, 330, "creates many", F_BOLD(16), PALETTE["muted"], "mm")
    arrow(draw, [(1020, 355), (1260, 355)])
    text(draw, 1145, 320, "belongs to one", F_BOLD(16), PALETTE["muted"], "mm")
    arrow(draw, [(285, 470), (285, 620)])
    text(draw, 198, 548, "owns many", F_BOLD(16), PALETTE["muted"], "mm")
    arrow(draw, [(840, 500), (840, 610)])
    text(draw, 735, 555, "triggers many", F_BOLD(16), PALETTE["muted"], "mm")
    arrow(draw, [(450, 730), (650, 730)])
    text(draw, 550, 695, "notifies", F_BOLD(16), PALETTE["muted"], "mm")
    arrow(draw, [(1050, 730), (1260, 730)])
    text(draw, 1155, 695, "queues delivery", F_BOLD(16), PALETTE["muted"], "mm")
    export(image, "Figure_4_3_Entity_Relationship_Diagram.png")


def make_erd_revised() -> None:
    image = Image.new("RGBA", (1800, 1120), "#FCFDFE")
    draw = ImageDraw.Draw(image)

    text(draw, 70, 72, "Entity Relationship Diagram", F_TITLE(36), "#1E293B", "la")

    def table_box(x1, y1, w, title_value, fields, header_fill="#2F6FED"):
        x2 = x1 + w
        row_h = 38
        h = 54 + row_h * len(fields) + 18
        y2 = y1 + h
        draw.rounded_rectangle((x1, y1, x2, y2), radius=10, fill="#FFFFFF", outline="#8CA3BF", width=2)
        draw.rectangle((x1, y1, x2, y1 + 54), fill=header_fill)
        text(draw, x1 + 18, y1 + 28, title_value, F_BOLD(22), "#FFFFFF", "lm")
        yy = y1 + 72
        for idx, field in enumerate(fields):
            if idx > 0:
                draw.line((x1 + 1, yy - 14, x2 - 1, yy - 14), fill="#E6ECF5", width=1)
            text(draw, x1 + 18, yy, field, F_SUB(18), "#1E293B", "lm")
            yy += row_h
        return (x1, y1, x2, y2)

    def one_marker(x, y, horizontal=True, direction=1):
        if horizontal:
            draw.line((x, y - 12, x, y + 12), fill="#334155", width=3)
        else:
            draw.line((x - 12, y, x + 12, y), fill="#334155", width=3)

    def many_marker(x, y, horizontal=True, direction=1):
        if horizontal:
            dx = 18 * direction
            draw.line((x, y, x + dx, y - 12), fill="#334155", width=3)
            draw.line((x, y, x + dx, y), fill="#334155", width=3)
            draw.line((x, y, x + dx, y + 12), fill="#334155", width=3)
        else:
            dy = 18 * direction
            draw.line((x, y, x - 12, y + dy), fill="#334155", width=3)
            draw.line((x, y, x, y + dy), fill="#334155", width=3)
            draw.line((x, y, x + 12, y + dy), fill="#334155", width=3)

    def rel_h(left, right, y, left_many=False, right_many=False, label_value=""):
        x1 = left
        x2 = right
        draw.line((x1, y, x2, y), fill="#334155", width=3)
        if left_many:
            many_marker(x1, y, horizontal=True, direction=-1)
        else:
            one_marker(x1, y, horizontal=True, direction=-1)
        if right_many:
            many_marker(x2, y, horizontal=True, direction=1)
        else:
            one_marker(x2, y, horizontal=True, direction=1)
        if label_value:
            text(draw, (x1 + x2) // 2, y - 22, label_value, F_SUB(16), "#64748B", "mm")

    def rel_v(x, top, bottom, top_many=False, bottom_many=False, label_value=""):
        y1 = top
        y2 = bottom
        draw.line((x, y1, x, y2), fill="#334155", width=3)
        if top_many:
            many_marker(x, y1, horizontal=False, direction=-1)
        else:
            one_marker(x, y1, horizontal=False, direction=-1)
        if bottom_many:
            many_marker(x, y2, horizontal=False, direction=1)
        else:
            one_marker(x, y2, horizontal=False, direction=1)
        if label_value:
            text(draw, x + 90, (y1 + y2) // 2, label_value, F_SUB(16), "#64748B", "mm")

    def rel_elbow(points, start_many=False, end_many=False):
        draw.line(points, fill="#334155", width=3)
        (sx1, sy1), (sx2, sy2) = points[0], points[1]
        (ex1, ey1), (ex2, ey2) = points[-2], points[-1]
        start_horizontal = sy1 == sy2
        end_horizontal = ey1 == ey2
        if start_many:
            many_marker(sx1, sy1, horizontal=start_horizontal, direction=-1 if start_horizontal and sx2 > sx1 else (1 if start_horizontal else (-1 if sy2 > sy1 else 1)))
        else:
            one_marker(sx1, sy1, horizontal=start_horizontal)
        if end_many:
            many_marker(ex2, ey2, horizontal=end_horizontal, direction=1 if end_horizontal and ex2 > ex1 else (-1 if end_horizontal else (1 if ey2 > ey1 else -1)))
        else:
            one_marker(ex2, ey2, horizontal=end_horizontal)

    users = table_box(90, 180, 360, "users", [
        "PK id",
        "email",
        "phone",
        "full_name",
        "role",
        "district_id FK",
    ])
    complaints = table_box(700, 150, 400, "complaints", [
        "PK id",
        "description",
        "category",
        "status",
        "district_id FK",
        "created_by_id FK",
    ], header_fill="#F59E0B")
    districts = table_box(1320, 180, 320, "districts", [
        "PK id",
        "name",
        "boundary",
    ], header_fill="#10B981")
    user_devices = table_box(100, 650, 350, "user_devices", [
        "PK id",
        "user_id FK",
        "platform",
        "fcm_token",
    ], header_fill="#8B5CF6")
    notification_events = table_box(680, 620, 440, "notification_events", [
        "PK id",
        "user_id FK",
        "complaint_id FK",
        "title",
        "delivery_status",
    ], header_fill="#14B8A6")
    queue_jobs = table_box(1340, 680, 320, "queue_jobs", [
        "PK id",
        "type",
        "status",
        "payload",
    ], header_fill="#64748B")

    # cleaner database-style relationships
    rel_h(users[2], complaints[0], 320, left_many=False, right_many=True)
    text(draw, 565, 288, "1 : N", F_SUB(16), "#64748B", "mm")
    rel_h(complaints[2], districts[0], 315, left_many=True, right_many=False)
    text(draw, 1215, 283, "N : 1", F_SUB(16), "#64748B", "mm")
    rel_h(user_devices[2], notification_events[0], 800, left_many=False, right_many=True)
    text(draw, 565, 768, "1 : N", F_SUB(16), "#64748B", "mm")
    rel_h(notification_events[2], queue_jobs[0], 825, left_many=False, right_many=True)
    text(draw, 1230, 793, "1 : N", F_SUB(16), "#64748B", "mm")

    rel_v(270, users[3], user_devices[1], top_many=False, bottom_many=True)
    text(draw, 360, 560, "1 : N", F_SUB(16), "#64748B", "mm")
    rel_v(900, complaints[3], notification_events[1], top_many=False, bottom_many=True)
    text(draw, 990, 540, "1 : N", F_SUB(16), "#64748B", "mm")

    # optional direct recipient relationship, routed cleanly
    rel_elbow([(450, 250), (560, 250), (560, 705), (680, 705)], start_many=False, end_many=True)
    text(draw, 610, 226, "1 : N", F_SUB(16), "#64748B", "mm")

    export(image, "Figure_4_3_Entity_Relationship_Diagram_Revised_v2.png")


def main() -> None:
    make_org_chart()
    make_auth_flow()
    make_auth_flow_revised_simple()
    make_auth_ui("Figure_4_2_1_4_User_Registration_Login_Design.png", "4.2.1.4", "Design: User Registration and Login")
    make_complaint_flow()
    make_complaint_flow_revised()
    make_complaint_ui("Figure_4_2_2_4_Complaint_Reporting_Design.png", "4.2.2.4", "Design: Complaint Reporting and District Assignment")
    make_notification_flow()
    make_notification_flow_revised()
    make_notification_ui("Figure_4_2_3_4_Notification_Update_Design.png", "4.2.3.4", "Design: Notification and Update Tracking")
    make_erd()
    make_erd_revised()
    make_auth_ui("Figure_4_4_1_Authentication_Snapshot.png", "4.4.1", "Authentication Snapshot")
    make_complaint_ui("Figure_4_4_2_Complaint_Reporting_Snapshot.png", "4.4.2", "Complaint Reporting Snapshot")
    make_notification_ui("Figure_4_4_3_Notification_Snapshot.png", "4.4.3", "Notification Snapshot")
    print(OUT)


if __name__ == "__main__":
    main()
