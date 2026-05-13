from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, textwrap

OUT = Path(r"C:\Users\xamse\OneDrive\Desktop\hamze.apps\my-city\output\figures\chapter4")
OUT.mkdir(parents=True, exist_ok=True)

BG = "#1a1a2e"
BOX_FILL = "#2a2a3e"
BOX_BORDER = "#555577"
TEXT_COLOR = "#e0e0e0"
ACCENT_BLUE = "#4a9eff"
ACCENT_GREEN = "#4aff9e"
ACCENT_YELLOW = "#ffe44a"
ACCENT_RED = "#ff4a6a"
ACCENT_PURPLE = "#b44aff"
ACCENT_TEAL = "#4affef"
ACCENT_AMBER = "#ffaa4a"
MUTED = "#888899"
LINE_COLOR = "#666688"

def gf(name, size):
    for p in [Path(r"C:\Windows\Fonts")/name, Path(r"C:\Windows\Fonts")/"arial.ttf"]:
        if p.exists(): return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

FB = lambda s: gf("arialbd.ttf", s)
FR = lambda s: gf("arial.ttf", s)

def canvas(w, h):
    img = Image.new("RGBA", (w, h), BG)
    return img, ImageDraw.Draw(img)

def txt(d, x, y, s, f, fill=TEXT_COLOR, anchor="mm"):
    d.text((x, y), s, font=f, fill=fill, anchor=anchor)

def mtxt(d, box, s, f, fill=TEXT_COLOR, sp=4):
    x1,y1,x2,y2 = box
    bb = d.multiline_textbbox((0,0), s, font=f, spacing=sp, align="center")
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    d.multiline_text((x1+(x2-x1-tw)/2, y1+(y2-y1-th)/2), s, font=f, fill=fill, spacing=sp, align="center")

def box(d, xy, label, fill=BOX_FILL, border=BOX_BORDER, r=8, fs=18):
    d.rounded_rectangle(xy, radius=r, fill=fill, outline=border, width=2)
    mtxt(d, xy, label, FB(fs))

def terminal(d, xy, label, accent=ACCENT_YELLOW):
    x1,y1,x2,y2 = xy
    d.rounded_rectangle(xy, radius=(y2-y1)//2, fill=BG, outline=accent, width=3)
    mtxt(d, xy, label, FB(20), accent)

def diamond(d, cx, cy, w, h, label, fill="#2a3a2e", border=ACCENT_GREEN):
    pts = [(cx, cy-h//2), (cx+w//2, cy), (cx, cy+h//2), (cx-w//2, cy)]
    d.polygon(pts, fill=fill, outline=border, width=2)
    mtxt(d, (cx-w//2+15, cy-h//2+15, cx+w//2-15, cy+h//2-15), label, FB(16))

def arr(d, points, fill=LINE_COLOR, w=2, head=10):
    d.line(points, fill=fill, width=w, joint="curve")
    (x1,y1),(x2,y2) = points[-2], points[-1]
    a = math.atan2(y2-y1, x2-x1)
    l = (x2-head*math.cos(a-math.pi/6), y2-head*math.sin(a-math.pi/6))
    r = (x2-head*math.cos(a+math.pi/6), y2-head*math.sin(a+math.pi/6))
    d.polygon([(x2,y2), l, r], fill=fill)

def lbl(d, x, y, s):
    txt(d, x, y, s, FR(14), MUTED)

def save(img, name):
    img.convert("RGB").save(OUT/name, quality=96)
    print(f"Saved {name}")

# 1. Org Chart
def make_org():
    img, d = canvas(1400, 700)
    txt(d, 700, 35, "Organizational Chart — MyCity Smart City", FB(26), ACCENT_BLUE)
    terminal(d, (550, 70, 850, 130), "System Admin", ACCENT_RED)
    d.line([(700,130),(700,170)], fill=ACCENT_RED, width=3)
    box(d, (500,170,900,240), "City Administrator", border=ACCENT_GREEN, fs=20)
    d.line([(700,240),(700,280)], fill=LINE_COLOR, width=2)
    d.line([(200,280),(1200,280)], fill=LINE_COLOR, width=2)
    for x in [200, 500, 700, 1000, 1200]:
        d.line([(x,280),(x,320)], fill=LINE_COLOR, width=2)
    boxes = [
        ((80,320,320,400), "Citizen Users", ACCENT_PURPLE),
        ((380,320,620,400), "District Admin", ACCENT_BLUE),
        ((580,320,820,400), "Complaint Ops", ACCENT_TEAL),
        ((880,320,1120,400), "Platform Support", ACCENT_AMBER),
        ((1080,320,1320,400), "Notification Team", "#ea6bd4"),
    ]
    for xy, lb, clr in boxes:
        box(d, xy, lb, border=clr, fs=16)
    # sub items
    subs = [
        (200, 420, [("Issue Reporters", 460), ("Community Supporters", 520)], ACCENT_PURPLE),
        (500, 420, [("Status Control", 460), ("District Queues", 520)], ACCENT_BLUE),
        (1000, 420, [("Geo Routing", 460)], ACCENT_TEAL),
        (1200, 420, [("Push & Updates", 460)], "#ea6bd4"),
    ]
    for x, sy, items, clr in subs:
        d.line([(x, 400),(x, sy)], fill=clr, width=2)
        for lb, iy in items:
            d.line([(x, iy-20),(x, iy)], fill=clr, width=2)
            box(d, (x-100, iy, x+100, iy+45), lb, border=clr, fs=14)
    save(img, "Figure_4_1_1_Org_Chart_Dark.png")

# 2. Auth Flow
def make_auth():
    img, d = canvas(1400, 1200)
    txt(d, 700, 30, "User Registration and Login Flow", FB(24), ACCENT_BLUE)
    terminal(d, (550, 60, 850, 110), "Start", ACCENT_BLUE)
    arr(d, [(700,110),(700,150)])
    box(d, (450,150,950,210), "Open Login / Register Screen", fs=18)
    arr(d, [(700,210),(700,260)])
    diamond(d, 700, 320, 280, 120, "Choose\nAction")
    # Register
    lbl(d, 440, 285, "Register")
    arr(d, [(560,320),(300,320),(300,400)])
    box(d, (130,400,470,470), "Enter name, email,\nphone, password", border=ACCENT_PURPLE, fs=16)
    arr(d, [(300,470),(300,520)])
    box(d, (180,520,420,575), "Validate input", border=ACCENT_GREEN, fs=16)
    arr(d, [(300,575),(300,620)])
    diamond(d, 300, 680, 180, 100, "Valid?")
    lbl(d, 180, 650, "No")
    arr(d, [(210,680),(120,680),(120,750)])
    box(d, (40,750,200,800), "Show error", border=ACCENT_RED, fs=14)
    arr(d, [(120,800),(120,850)])
    box(d, (30,850,210,900), "Re-enter data", border=ACCENT_AMBER, fs=14)
    d.line([(30,875),(15,875),(15,435),(130,435)], fill=LINE_COLOR, width=2)
    lbl(d, 400, 650, "Yes")
    arr(d, [(390,680),(470,680),(470,750)])
    box(d, (380,750,560,800), "Save user", border=ACCENT_BLUE, fs=14)
    arr(d, [(470,800),(470,850)])
    box(d, (370,850,570,900), "Success msg", border=ACCENT_GREEN, fs=14)
    # Login
    lbl(d, 920, 285, "Login")
    arr(d, [(840,320),(1100,320),(1100,400)])
    box(d, (930,400,1270,470), "Enter email/phone\nand password", border=ACCENT_BLUE, fs=16)
    arr(d, [(1100,470),(1100,520)])
    box(d, (980,520,1220,575), "Validate credentials", border=ACCENT_GREEN, fs=16)
    arr(d, [(1100,575),(1100,620)])
    diamond(d, 1100, 680, 180, 100, "Valid?")
    lbl(d, 990, 650, "Yes")
    arr(d, [(1010,680),(930,680),(930,750)])
    box(d, (840,750,1020,800), "Create session", border=ACCENT_BLUE, fs=14)
    arr(d, [(930,800),(930,850)])
    box(d, (820,850,1040,900), "Go to home map", border=ACCENT_GREEN, fs=14)
    lbl(d, 1220, 650, "No")
    arr(d, [(1190,680),(1280,680),(1280,750)])
    box(d, (1200,750,1360,800), "Show error", border=ACCENT_RED, fs=14)
    arr(d, [(1280,800),(1280,850)])
    box(d, (1180,850,1380,900), "Re-enter login", border=ACCENT_AMBER, fs=14)
    d.line([(1380,875),(1395,875),(1395,435),(1270,435)], fill=LINE_COLOR, width=2)
    # Merge
    d.line([(470,900),(470,950),(930,950),(930,900)], fill=LINE_COLOR, width=2)
    d.line([(700,950),(700,980)], fill=LINE_COLOR, width=2)
    terminal(d, (580, 980, 820, 1030), "End", ACCENT_RED)
    save(img, "Figure_4_2_1_2_Auth_Flow_Dark.png")

# 3. Auth UI
def make_auth_ui():
    img, d = canvas(800, 700)
    txt(d, 400, 30, "Auth Screen Design", FB(22), ACCENT_BLUE)
    d.rounded_rectangle((200,60,600,660), radius=30, fill="#ffffff", outline="#333355", width=3)
    txt(d, 400, 110, "MyCity", FB(28), "#111111")
    txt(d, 400, 145, "Create account or sign in", FR(16), "#666666")
    for i, lb in enumerate(["Full name", "Email or phone", "Password"]):
        y = 180 + i*75
        d.rounded_rectangle((250,y,550,y+55), radius=12, fill="#f0f4ff", outline="#2576df", width=2)
        txt(d, 400, y+27, lb, FR(16), "#888888")
    d.rounded_rectangle((280,420,520,475), radius=25, fill="#2576df", outline="#2576df", width=2)
    txt(d, 400, 448, "Create account", FB(16), "#ffffff")
    d.rounded_rectangle((310,500,490,540), radius=12, fill="#111111", outline="#111111", width=2)
    txt(d, 400, 520, "Switch mode", FR(14), "#ffffff")
    # Label
    d.rounded_rectangle((30,120,170,160), radius=8, fill="#2a2a3e", outline=ACCENT_BLUE, width=2)
    txt(d, 100, 140, "AUTH PAGE", FB(14), ACCENT_BLUE)
    save(img, "Figure_4_2_1_4_Auth_UI_Dark.png")

# 4. Complaint Flow
def make_complaint():
    img, d = canvas(1400, 1100)
    txt(d, 700, 30, "Complaint Reporting and District Assignment Flow", FB(22), ACCENT_BLUE)
    terminal(d, (550, 60, 850, 110), "Start", ACCENT_GREEN)
    arr(d, [(700,110),(700,155)])
    box(d, (430,155,970,215), "Open Report Issue Screen", fs=18)
    arr(d, [(700,215),(700,265)])
    box(d, (400,265,1000,330), "Select category and enter description", fs=18)
    arr(d, [(700,330),(700,380)])
    diamond(d, 700, 440, 260, 110, "Save offline?")
    lbl(d, 510, 405, "Yes")
    arr(d, [(570,440),(300,440),(300,530)])
    box(d, (140,530,460,600), "Queue local complaint", border=ACCENT_PURPLE, fs=16)
    arr(d, [(300,600),(300,660)])
    box(d, (120,660,480,730), "Save for sync when\ninternet returns", border=ACCENT_PURPLE, fs=16)
    lbl(d, 880, 405, "No")
    arr(d, [(830,440),(1100,440),(1100,530)])
    box(d, (920,530,1280,600), "Validate and check\nclientRequestId", border=ACCENT_BLUE, fs=16)
    arr(d, [(1100,600),(1100,660)])
    box(d, (900,660,1300,730), "Resolve location and\nfind district", border=ACCENT_TEAL, fs=16)
    arr(d, [(1100,730),(1100,790)])
    box(d, (930,790,1270,855), "Save complaint record", border=ACCENT_GREEN, fs=16)
    arr(d, [(1100,855),(1100,915)])
    box(d, (870,915,1330,985), "Create notification event\nand queue delivery", border=ACCENT_AMBER, fs=16)
    d.line([(300,730),(300,1030),(700,1030)], fill=LINE_COLOR, width=2)
    d.line([(1100,985),(1100,1030),(700,1030)], fill=LINE_COLOR, width=2)
    terminal(d, (580, 1035, 820, 1080), "End", ACCENT_RED)
    save(img, "Figure_4_2_2_2_Complaint_Flow_Dark.png")

# 5. Complaint UI
def make_complaint_ui():
    img, d = canvas(800, 750)
    txt(d, 400, 30, "Complaint Reporting Screen", FB(22), ACCENT_BLUE)
    d.rounded_rectangle((150,60,650,710), radius=30, fill="#ffffff", outline="#333355", width=3)
    txt(d, 400, 105, "Report Issue", FB(24), "#111111")
    chips = [("Water",190,135,280), ("Roads",295,135,385), ("Lighting",400,135,510), ("Waste",525,135,610)]
    for lb, x1, y1, x2 in chips:
        sel = lb == "Water"
        d.rounded_rectangle((x1,y1,x2,y1+40), radius=14, fill="#d9e7ff" if sel else "#f5f5f5", outline="#2576df" if sel else "#cccccc", width=2)
        txt(d, (x1+x2)//2, y1+20, lb, FR(14), "#2576df" if sel else "#666666")
    d.rounded_rectangle((200,195,600,340), radius=14, fill="#ffffff", outline="#cccccc", width=2)
    txt(d, 400, 220, "Describe the issue", FB(16), "#333333")
    txt(d, 400, 260, "Example: Water leak near\nschool gate", FR(14), "#999999")
    d.rounded_rectangle((200,365,600,460), radius=14, fill="#ffffff", outline="#cccccc", width=2)
    txt(d, 400, 395, "Captured location", FB(16), "#333333")
    txt(d, 400, 425, "Lat / Lng + image upload", FR(14), "#999999")
    d.rounded_rectangle((220,500,390,550), radius=22, fill="#ffffff", outline="#0b9a27", width=3)
    txt(d, 305, 525, "Save Offline", FB(14), "#0b9a27")
    d.rounded_rectangle((410,500,580,550), radius=22, fill="#2576df", outline="#2576df", width=2)
    txt(d, 495, 525, "Submit Now", FB(14), "#ffffff")
    save(img, "Figure_4_2_2_4_Complaint_UI_Dark.png")

# 6. Notification Flow
def make_notif():
    img, d = canvas(1400, 1200)
    txt(d, 700, 30, "Notification and Update Tracking Flow", FB(22), ACCENT_BLUE)
    terminal(d, (500, 60, 900, 110), "Complaint Event", ACCENT_GREEN)
    arr(d, [(700,110),(700,160)])
    box(d, (420,160,980,225), "Save notification event record", fs=18)
    arr(d, [(700,225),(700,275)])
    box(d, (450,275,950,335), "Enqueue delivery job", fs=18)
    arr(d, [(700,335),(700,385)])
    box(d, (450,385,950,445), "Worker reserves job", fs=18)
    arr(d, [(700,445),(700,500)])
    box(d, (420,500,980,565), "Load active user devices", border=ACCENT_TEAL, fs=18)
    arr(d, [(700,565),(700,615)])
    diamond(d, 700, 680, 260, 120, "Devices\nfound?")
    lbl(d, 510, 645, "No")
    arr(d, [(570,680),(300,680),(300,770)])
    box(d, (100,770,500,840), "Mark no_devices\nand save status", border=ACCENT_RED, fs=16)
    lbl(d, 880, 645, "Yes")
    arr(d, [(830,680),(1100,680),(1100,770)])
    box(d, (900,770,1300,840), "Push / fallback\ndelivery attempt", border=ACCENT_AMBER, fs=16)
    d.line([(300,840),(300,900),(700,900)], fill=LINE_COLOR, width=2)
    d.line([(1100,840),(1100,900),(700,900)], fill=LINE_COLOR, width=2)
    box(d, (400,900,1000,970), "Update delivery status,\nattempts, and timestamps", border=ACCENT_GREEN, fs=16)
    arr(d, [(700,970),(700,1020)])
    box(d, (420,1020,980,1080), "Citizen refreshes Updates screen", fs=18)
    arr(d, [(700,1080),(700,1120)])
    terminal(d, (580, 1120, 820, 1165), "End", ACCENT_RED)
    save(img, "Figure_4_2_3_2_Notification_Flow_Dark.png")

# 7. Notification UI
def make_notif_ui():
    img, d = canvas(800, 780)
    txt(d, 400, 30, "Notification Screen Design", FB(22), ACCENT_BLUE)
    d.rounded_rectangle((150,60,650,740), radius=30, fill="#ffffff", outline="#333355", width=3)
    txt(d, 400, 105, "Updates", FB(24), "#111111")
    txt(d, 400, 135, "Status changes and confirmations", FR(14), "#888888")
    cards = [
        ("Complaint received", "Your report was saved and is waiting\nfor district review.", "just now"),
        ("Status updated", "Water issue is now resolved.", "2 hr ago"),
        ("Status updated", "Road repair is now in progress.", "1 day ago"),
    ]
    y = 170
    for t, b, tm in cards:
        d.rounded_rectangle((200, y, 600, y+130), radius=14, fill="#ffffff", outline="#dddddd", width=2)
        txt(d, 400, y+30, t, FB(16), "#111111")
        txt(d, 400, y+70, b, FR(14), "#555555")
        txt(d, 400, y+105, tm, FR(12), "#aaaaaa")
        y += 150
    d.rounded_rectangle((300, y+10, 500, y+50), radius=12, fill="#111111")
    txt(d, 400, y+30, "Pull to refresh", FR(14), "#ffffff")
    save(img, "Figure_4_2_3_4_Notification_UI_Dark.png")

# 8. ERD
def make_erd():
    img, d = canvas(1600, 1000)
    txt(d, 800, 30, "Entity Relationship Diagram — MyCity", FB(24), ACCENT_BLUE)
    def tbl(x, y, w, title, fields, hdr_clr):
        rh = 32
        h = 42 + rh * len(fields) + 10
        d.rounded_rectangle((x, y, x+w, y+h), radius=8, fill=BOX_FILL, outline=BOX_BORDER, width=2)
        d.rectangle((x, y, x+w, y+42), fill=hdr_clr)
        d.rounded_rectangle((x, y, x+w, y+20), radius=8, fill=hdr_clr)
        txt(d, x+w//2, y+22, title, FB(16), "#ffffff")
        fy = y + 55
        for f in fields:
            txt(d, x+12, fy, f, FR(14), TEXT_COLOR, "lm")
            fy += rh
        return (x, y, x+w, y+h)

    u = tbl(50, 120, 280, "USERS", ["PK id","email","phone","full_name","role","district_id FK"], ACCENT_BLUE)
    c = tbl(500, 80, 300, "COMPLAINTS", ["PK id","description","category","status","district_id FK","created_by_id FK"], ACCENT_AMBER)
    di = tbl(1000, 120, 250, "DISTRICTS", ["PK id","name","boundary"], ACCENT_GREEN)
    cm = tbl(500, 500, 280, "COMMENTS", ["PK id","complaint_id FK","author_id FK","body"], "#6a7a8a")
    re = tbl(500, 750, 280, "REACTIONS", ["PK id","complaint_id FK","user_id FK","type"], "#6a7a8a")
    ud = tbl(50, 550, 280, "USER_DEVICES", ["PK id","user_id FK","platform","fcm_token"], ACCENT_PURPLE)
    ne = tbl(950, 500, 320, "NOTIF_EVENTS", ["PK id","user_id FK","complaint_id FK","title","delivery_status"], ACCENT_TEAL)
    qj = tbl(1300, 550, 250, "QUEUE_JOBS", ["PK id","type","status","payload"], "#6a7a8a")
    # Relations
    d.line([(330,220),(500,220)], fill=LINE_COLOR, width=2); lbl(d, 415, 205, "1:N")
    d.line([(800,220),(1000,220)], fill=LINE_COLOR, width=2); lbl(d, 900, 205, "N:1")
    d.line([(190,380),(190,550)], fill=LINE_COLOR, width=2); lbl(d, 220, 470, "1:N")
    d.line([(650,420),(650,500)], fill=LINE_COLOR, width=2); lbl(d, 680, 460, "1:N")
    d.line([(650,700),(650,750)], fill=LINE_COLOR, width=2); lbl(d, 680, 725, "1:N")
    d.line([(800,600),(950,600)], fill=LINE_COLOR, width=2); lbl(d, 875, 585, "1:N")
    d.line([(1270,650),(1300,650)], fill=LINE_COLOR, width=2); lbl(d, 1285, 635, "1:N")
    save(img, "Figure_4_3_ERD_Dark.png")

# 9. Architecture
def make_arch():
    img, d = canvas(1600, 600)
    txt(d, 800, 25, "MyCity System Architecture", FB(24), ACCENT_BLUE)
    # Clients
    d.rounded_rectangle((30,80,230,300), radius=12, fill="#1e1e32", outline=BOX_BORDER, width=2)
    txt(d, 130, 65, "Clients", FB(16), MUTED)
    box(d, (45,100,215,155), "Citizen App\n(Flutter)", border=ACCENT_PURPLE, fs=13)
    box(d, (45,175,215,250), "District Staff\n(Ops Portal)", border=ACCENT_BLUE, fs=13)
    # API Layer
    d.rounded_rectangle((270,80,580,300), radius=12, fill="#1e1e32", outline=BOX_BORDER, width=2)
    txt(d, 425, 65, "API Layer", FB(16), MUTED)
    box(d, (290,110,560,165), "API Gateway (NestJS)", border=ACCENT_BLUE, fs=14)
    box(d, (290,190,560,255), "Auth Middleware\n(JWT + RBAC)", border=ACCENT_GREEN, fs=14)
    # Controllers
    d.rounded_rectangle((620,50,900,550), radius=12, fill="#1e1e32", outline=BOX_BORDER, width=2)
    txt(d, 760, 35, "Controllers", FB(16), MUTED)
    ctrls = ["Complaints","Comments","Reactions","Notifications","Districts","Uploads","Auth"]
    for i, c in enumerate(ctrls):
        box(d, (640, 65+i*68, 880, 65+i*68+52), f"{c}Controller", border=ACCENT_BLUE, fs=12)
    # Services
    d.rounded_rectangle((940,80,1200,400), radius=12, fill="#1e1e32", outline=BOX_BORDER, width=2)
    txt(d, 1070, 65, "Services", FB(16), MUTED)
    svcs = [("ComplaintsService", ACCENT_BLUE), ("DistrictsService", ACCENT_GREEN), ("QueueService", ACCENT_AMBER), ("NotificationsService", ACCENT_TEAL)]
    for i, (s, clr) in enumerate(svcs):
        box(d, (960, 100+i*72, 1180, 100+i*72+55), s, border=clr, fs=12)
    # Data
    d.rounded_rectangle((1240,80,1570,400), radius=12, fill="#1e1e32", outline=BOX_BORDER, width=2)
    txt(d, 1405, 65, "Data", FB(16), MUTED)
    box(d, (1260,105,1550,170), "PostgreSQL\n+ PostGIS", border=ACCENT_GREEN, fs=14)
    box(d, (1260,195,1550,250), "Redis", border=ACCENT_RED, fs=14)
    box(d, (1260,275,1550,340), "FCM\n(Firebase)", border=ACCENT_AMBER, fs=14)
    # Connection lines
    arr(d, [(230,190),(270,190)])
    arr(d, [(560,190),(620,190)])
    arr(d, [(880,190),(940,190)])
    arr(d, [(1180,190),(1240,190)])
    save(img, "Figure_4_Architecture_Dark.png")

print("Generating all dark-themed diagrams...")
make_org()
make_auth()
make_auth_ui()
make_complaint()
make_complaint_ui()
make_notif()
make_notif_ui()
make_erd()
make_arch()
print("Done! All diagrams saved to output/figures/chapter4/")
