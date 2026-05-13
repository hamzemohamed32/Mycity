param(
  [string]$PackageRoot = "C:\Users\xamse\OneDrive\Desktop\hamze.apps\my-city\tmp\chapter4_check2",
  [string]$OutputDocx = "C:\Users\xamse\OneDrive\Desktop\hamze.apps\my-city\output\doc\MyCity_Chapter_Four_PNG_Diagrams.docx"
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Render-HtmlToPng {
  param(
    [string]$Html,
    [int]$Width,
    [int]$Height,
    [string]$OutputPath
  )

  $viewportHeight = [Math]::Min($Height, 720)

  $form = New-Object System.Windows.Forms.Form
  $form.FormBorderStyle = 'None'
  $form.ShowInTaskbar = $false
  $form.ClientSize = New-Object System.Drawing.Size($Width, $viewportHeight)
  $form.StartPosition = 'Manual'
  $form.Location = New-Object System.Drawing.Point(-32000, -32000)

  $browser = New-Object System.Windows.Forms.WebBrowser
  $browser.ScriptErrorsSuppressed = $true
  $browser.ScrollBarsEnabled = $false
  $browser.Width = $Width
  $browser.Height = $viewportHeight
  $browser.Dock = 'Fill'
  $form.Controls.Add($browser)

  $script:done = $false
  $browser.Add_DocumentCompleted({ $script:done = $true })
  $browser.DocumentText = $Html

  while (-not $script:done) {
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 100
  }

  Start-Sleep -Milliseconds 700
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)

  if ($Height -le $viewportHeight) {
    $browser.DrawToBitmap($bitmap, (New-Object System.Drawing.Rectangle 0, 0, $Width, $Height))
  }
  else {
    $y = 0
    while ($y -lt $Height) {
      $browser.Document.Window.ScrollTo(0, $y)
      [System.Windows.Forms.Application]::DoEvents()
      Start-Sleep -Milliseconds 250

      $tile = New-Object System.Drawing.Bitmap $Width, $viewportHeight
      $browser.DrawToBitmap($tile, (New-Object System.Drawing.Rectangle 0, 0, $Width, $viewportHeight))

      $segmentHeight = [Math]::Min($viewportHeight, $Height - $y)
      $sourceRect = New-Object System.Drawing.Rectangle 0, 0, $Width, $segmentHeight
      $destRect = New-Object System.Drawing.Rectangle 0, $y, $Width, $segmentHeight
      $graphics.DrawImage($tile, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      $tile.Dispose()

      $y += $segmentHeight
    }
  }

  $graphics.Dispose()
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  $form.Close()
}

function Safe-Html {
  param([string]$Text)
  ($Text -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;') -replace "`n", '<br/>'
}

function Label {
  param(
    [int]$Left,
    [int]$Top,
    [string]$Text,
    [int]$Size = 24,
    [string]$Color = '#111111',
    [string]$Weight = '700',
    [string]$Align = 'left',
    [int]$Width = 360
  )
  $safe = Safe-Html $Text
  "<div style='position:absolute;left:${Left}px;top:${Top}px;width:${Width}px;font-family:Arial,sans-serif;font-size:${Size}px;font-weight:${Weight};color:${Color};text-align:${Align};line-height:1.2;'>$safe</div>"
}

function Box {
  param(
    [int]$Left,
    [int]$Top,
    [int]$Width,
    [int]$Height,
    [string]$Text,
    [string]$Background = '#d9e7ff',
    [string]$Border = '#2576df',
    [int]$Radius = 14,
    [int]$Size = 22,
    [string]$Color = '#111111',
    [int]$BorderWidth = 4
  )
  $safe = Safe-Html $Text
  "<div style='position:absolute;left:${Left}px;top:${Top}px;width:${Width}px;height:${Height}px;background:${Background};border:${BorderWidth}px solid ${Border};border-radius:${Radius}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px;font-family:Arial,sans-serif;font-size:${Size}px;font-weight:700;color:${Color};line-height:1.18;'>$safe</div>"
}

function Pill {
  param(
    [int]$Left,
    [int]$Top,
    [int]$Width,
    [int]$Height,
    [string]$Text,
    [string]$Background = '#ffffff',
    [string]$Border = '#67a9f0',
    [int]$Size = 24,
    [string]$Color = '#111111',
    [int]$BorderWidth = 6
  )
  Box -Left $Left -Top $Top -Width $Width -Height $Height -Text $Text -Background $Background -Border $Border -Radius ([Math]::Floor($Height / 2)) -Size $Size -Color $Color -BorderWidth $BorderWidth
}

function HLine {
  param(
    [int]$Left,
    [int]$Top,
    [int]$Width,
    [string]$Color = '#555555',
    [int]$Thickness = 5
  )
  "<div style='position:absolute;left:${Left}px;top:${Top}px;width:${Width}px;height:${Thickness}px;background:${Color};'></div>"
}

function VLine {
  param(
    [int]$Left,
    [int]$Top,
    [int]$Height,
    [string]$Color = '#555555',
    [int]$Thickness = 5
  )
  "<div style='position:absolute;left:${Left}px;top:${Top}px;width:${Thickness}px;height:${Height}px;background:${Color};'></div>"
}

function ArrowDown {
  param(
    [int]$Left,
    [int]$Top,
    [string]$Color = '#555555',
    [int]$Size = 14
  )
  "<div style='position:absolute;left:${Left}px;top:${Top}px;width:0;height:0;border-left:${Size}px solid transparent;border-right:${Size}px solid transparent;border-top:${Size}px solid ${Color};'></div>"
}

function ArrowRight {
  param(
    [int]$Left,
    [int]$Top,
    [string]$Color = '#555555',
    [int]$Size = 14
  )
  "<div style='position:absolute;left:${Left}px;top:${Top}px;width:0;height:0;border-top:${Size}px solid transparent;border-bottom:${Size}px solid transparent;border-left:${Size}px solid ${Color};'></div>"
}

function PhoneFrame {
  param(
    [int]$Left,
    [int]$Top,
    [int]$Width,
    [int]$Height,
    [string]$Title
  )
  @(
    "<div style='position:absolute;left:${Left}px;top:${Top}px;width:${Width}px;height:${Height}px;background:#ffffff;border:3px solid #111111;border-radius:28px;box-sizing:border-box;'></div>"
    "<div style='position:absolute;left:$($Left + 110)px;top:$($Top + 18)px;width:$($Width - 220)px;height:12px;background:#111111;border-radius:10px;'></div>"
    Label -Left ($Left + 40) -Top ($Top + 50) -Width ($Width - 80) -Text $Title -Size 30 -Align center
  ) -join ''
}

function PageHtml {
  param(
    [int]$Width,
    [int]$Height,
    [string[]]$Parts
  )
  @"
<html>
<head>
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
</head>
<body style="margin:0;background:#ffffff;position:relative;width:${Width}px;height:${Height}px;overflow:hidden;">
  $($Parts -join "`n")
</body>
</html>
"@
}

function Build-OrgChartHtml {
  @(
    Label -Left 70 -Top 35 -Text "organizational chart`nMyCity Smart City" -Size 28 -Width 420
    Pill -Left 740 -Top 22 -Width 200 -Height 74 -Text "System Admin" -Border '#67a9f0'
    VLine -Left 837 -Top 96 -Height 42 -Color '#ef2323'
    Pill -Left 690 -Top 140 -Width 300 -Height 80 -Text "City Administrator" -Border '#56c95d'
    VLine -Left 837 -Top 220 -Height 70
    HLine -Left 170 -Top 286 -Width 760
    VLine -Left 170 -Top 286 -Height 42
    VLine -Left 930 -Top 286 -Height 42
    VLine -Left 255 -Top 286 -Height 106
    VLine -Left 430 -Top 286 -Height 106
    VLine -Left 620 -Top 286 -Height 106
    VLine -Left 810 -Top 286 -Height 106
    VLine -Left 995 -Top 286 -Height 106
    Box -Left 95 -Top 392 -Width 150 -Height 80 -Text "Citizen`nUsers" -Background '#cfd0fa' -Border '#8a83ef'
    Box -Left 330 -Top 392 -Width 150 -Height 80 -Text "District`nAdmin" -Background '#b6d5ff' -Border '#5d95ea'
    Box -Left 520 -Top 392 -Width 170 -Height 80 -Text "Complaint`nOperations" -Background '#1dc0b0' -Border '#0f8f83'
    Box -Left 710 -Top 392 -Width 170 -Height 80 -Text "Platform`nSupport" -Background '#d7cba7' -Border '#9f8d5d'
    Box -Left 900 -Top 392 -Width 190 -Height 80 -Text "Notification`nand API Team" -Background '#ea6bd4' -Border '#c13aaa'
    VLine -Left 168 -Top 472 -Height 42 -Color '#d85a00'
    HLine -Left 128 -Top 514 -Width 40 -Color '#d85a00'
    VLine -Left 128 -Top 514 -Height 128 -Color '#d85a00'
    HLine -Left 128 -Top 552 -Width 56 -Color '#d85a00'
    HLine -Left 128 -Top 640 -Width 56 -Color '#d85a00'
    Box -Left 95 -Top 528 -Width 170 -Height 72 -Text "Issue`nReporters" -Background '#8f8bec' -Border '#655bf0'
    Box -Left 95 -Top 616 -Width 170 -Height 72 -Text "Community`nSupporters" -Background '#6357ef' -Border '#3d32c9' -Color '#ffffff'
    VLine -Left 403 -Top 472 -Height 42 -Color '#d38cff'
    HLine -Left 403 -Top 514 -Width 46 -Color '#d38cff'
    VLine -Left 449 -Top 514 -Height 128 -Color '#d38cff'
    HLine -Left 449 -Top 552 -Width 56 -Color '#d38cff'
    HLine -Left 449 -Top 640 -Width 56 -Color '#d38cff'
    Box -Left 505 -Top 528 -Width 150 -Height 72 -Text "Status`nControl" -Background '#69a0e7' -Border '#2576df'
    Box -Left 505 -Top 616 -Width 175 -Height 72 -Text "District`nQueues" -Background '#2775db' -Border '#0f4ea5' -Color '#ffffff'
    VLine -Left 790 -Top 472 -Height 60 -Color '#2371d8'
    HLine -Left 790 -Top 532 -Width 50 -Color '#2371d8'
    Box -Left 840 -Top 500 -Width 175 -Height 80 -Text "Geo Routing`nand Review" -Background '#139790' -Border '#0d6a66' -Color '#ffffff'
    VLine -Left 990 -Top 472 -Height 60 -Color '#d38cff'
    HLine -Left 990 -Top 532 -Width 40 -Color '#d38cff'
    Box -Left 1030 -Top 500 -Width 125 -Height 80 -Text "Push and`nUpdates" -Background '#b720f0' -Border '#8814b8' -Color '#ffffff'
  ) -join "`n"
}

function Build-AuthFlowHtml {
  @(
    Pill -Left 450 -Top 20 -Width 260 -Height 74 -Text "Start" -Border '#ef2323'
    VLine -Left 577 -Top 94 -Height 44 -Color '#ef2323'
    ArrowDown -Left 569 -Top 138 -Color '#ef2323'
    Box -Left 340 -Top 154 -Width 480 -Height 78 -Text "Open Login / Register Screen" -Background '#6ea8eb' -Border '#2576df'
    VLine -Left 577 -Top 232 -Height 50
    ArrowDown -Left 569 -Top 282
    Box -Left 335 -Top 296 -Width 490 -Height 82 -Text "User selects Register or Login" -Background '#2576df' -Border '#0f4ea5' -Color '#ffffff'
    Label -Left 120 -Top 410 -Text "Register" -Size 30 -Color '#655bf0'
    Label -Left 930 -Top 410 -Text "Login" -Size 30 -Color '#2576df' -Align center -Width 130
    HLine -Left 335 -Top 335 -Width 140
    VLine -Left 335 -Top 335 -Height 170
    ArrowDown -Left 327 -Top 505
    HLine -Left 825 -Top 335 -Width 140
    VLine -Left 960 -Top 335 -Height 150
    ArrowDown -Left 952 -Top 485
    Box -Left 180 -Top 520 -Width 210 -Height 66 -Text "Register" -Background '#d0cff8' -Border '#8f8bec'
    VLine -Left 282 -Top 586 -Height 52 -Color '#d85a00'
    ArrowDown -Left 274 -Top 638 -Color '#d85a00'
    Box -Left 160 -Top 654 -Width 250 -Height 72 -Text "Enter name, email / phone, password" -Background '#8d89ef' -Border '#655bf0' -Color '#ffffff' -Size 20
    VLine -Left 282 -Top 726 -Height 48 -Color '#d85a00'
    ArrowDown -Left 274 -Top 774 -Color '#d85a00'
    Box -Left 180 -Top 790 -Width 210 -Height 66 -Text "Validate Input" -Background '#5ac45a' -Border '#0b9a27'
    Box -Left 830 -Top 520 -Width 250 -Height 66 -Text "Enter email / phone and password" -Background '#72aef3' -Border '#2576df' -Size 20
    VLine -Left 952 -Top 586 -Height 52 -Color '#d38cff'
    ArrowDown -Left 944 -Top 638 -Color '#d38cff'
    Box -Left 855 -Top 654 -Width 200 -Height 66 -Text "Validate Credentials" -Background '#2576df' -Border '#0f4ea5' -Color '#ffffff'
    Box -Left 220 -Top 892 -Width 130 -Height 84 -Text "Valid?" -Background '#ffffff' -Border '#111111' -Radius 4
    Box -Left 890 -Top 892 -Width 130 -Height 84 -Text "Valid?" -Background '#ffffff' -Border '#111111' -Radius 4
    VLine -Left 282 -Top 856 -Height 36
    VLine -Left 952 -Top 720 -Height 172
    Label -Left 154 -Top 914 -Text "No" -Size 20 -Color '#111111' -Width 60
    HLine -Left 120 -Top 934 -Width 100
    Box -Left 30 -Top 896 -Width 150 -Height 76 -Text "Show Error" -Background '#c7daf8' -Border '#2576df'
    Label -Left 390 -Top 914 -Text "Yes" -Size 20 -Color '#111111' -Width 60
    VLine -Left 282 -Top 976 -Height 44
    ArrowDown -Left 274 -Top 1020
    Box -Left 200 -Top 1038 -Width 165 -Height 78 -Text "Save User`nRecord" -Background '#ffe34b' -Border '#d1b400'
    VLine -Left 282 -Top 1116 -Height 42
    ArrowDown -Left 274 -Top 1158
    Box -Left 175 -Top 1176 -Width 220 -Height 76 -Text "Success Message" -Background '#ffd529' -Border '#d1a500'
    Label -Left 1060 -Top 914 -Text "No" -Size 20 -Color '#111111' -Width 60
    HLine -Left 1020 -Top 934 -Width 70
    Box -Left 1030 -Top 896 -Width 140 -Height 76 -Text "Show Error" -Background '#eb6bd3' -Border '#c13aaa'
    Label -Left 820 -Top 914 -Text "Yes" -Size 20 -Color '#111111' -Width 60
    VLine -Left 952 -Top 976 -Height 44
    ArrowDown -Left 944 -Top 1020
    Box -Left 845 -Top 1038 -Width 210 -Height 78 -Text "Create Session" -Background '#d8cda9' -Border '#9f8d5d'
    VLine -Left 952 -Top 1116 -Height 42
    ArrowDown -Left 944 -Top 1158
    Box -Left 805 -Top 1176 -Width 290 -Height 76 -Text "Redirect to Home Map" -Background '#9c8f70' -Border '#6f6143' -Color '#ffffff'
    HLine -Left 285 -Top 1298 -Width 670
    VLine -Left 282 -Top 1252 -Height 46
    VLine -Left 952 -Top 1252 -Height 46
    Pill -Left 450 -Top 1314 -Width 260 -Height 74 -Text "End" -Border '#ef2323'
  ) -join "`n"
}

function Build-AuthUiHtml {
  @(
    PhoneFrame -Left 200 -Top 28 -Width 580 -Height 620 -Title 'MyCity'
    Label -Left 280 -Top 120 -Text 'Create account / Sign in' -Size 18 -Width 420 -Align center
    Box -Left 270 -Top 170 -Width 440 -Height 64 -Text 'Full name' -Background '#eef4ff' -Border '#2576df' -Size 18 -BorderWidth 3
    Box -Left 270 -Top 255 -Width 440 -Height 64 -Text 'Email or phone' -Background '#eef4ff' -Border '#2576df' -Size 18 -BorderWidth 3
    Box -Left 270 -Top 340 -Width 440 -Height 64 -Text 'Password' -Background '#eef4ff' -Border '#2576df' -Size 18 -BorderWidth 3
    Pill -Left 325 -Top 450 -Width 330 -Height 74 -Text 'Create account / Sign in' -Border '#ef2323' -Size 22
    Box -Left 370 -Top 548 -Width 240 -Height 48 -Text 'Switch mode' -Background '#111111' -Border '#111111' -Color '#ffffff' -Size 16 -Radius 10 -BorderWidth 2
    Box -Left 32 -Top 86 -Width 140 -Height 44 -Text 'AUTH PAGE' -Background '#111111' -Border '#111111' -Color '#ffffff' -Size 18 -Radius 8 -BorderWidth 2
  ) -join "`n"
}

function Build-ComplaintFlowHtml {
  @(
    Pill -Left 455 -Top 20 -Width 270 -Height 74 -Text 'Start' -Border '#4ba600'
    VLine -Left 587 -Top 94 -Height 48
    ArrowDown -Left 579 -Top 142
    Box -Left 330 -Top 158 -Width 520 -Height 80 -Text 'Open Report Issue Screen' -Background '#6ea8eb' -Border '#2576df'
    VLine -Left 587 -Top 238 -Height 52
    ArrowDown -Left 579 -Top 290
    Box -Left 300 -Top 306 -Width 580 -Height 84 -Text 'Select Category and Enter Description' -Background '#2576df' -Border '#0f4ea5' -Color '#ffffff'
    VLine -Left 587 -Top 390 -Height 54
    ArrowDown -Left 579 -Top 444
    Box -Left 470 -Top 462 -Width 240 -Height 94 -Text 'Save offline?' -Background '#ffffff' -Border '#111111' -Radius 4
    Label -Left 320 -Top 502 -Text 'Yes' -Size 20 -Width 60
    HLine -Left 250 -Top 507 -Width 220
    VLine -Left 250 -Top 507 -Height 132
    ArrowDown -Left 242 -Top 639
    Box -Left 110 -Top 658 -Width 280 -Height 84 -Text 'Queue Local Complaint' -Background '#8f8bec' -Border '#655bf0' -Color '#ffffff'
    Label -Left 725 -Top 502 -Text 'No' -Size 20 -Width 60
    HLine -Left 710 -Top 507 -Width 220
    VLine -Left 930 -Top 507 -Height 132
    ArrowDown -Left 922 -Top 639
    Box -Left 760 -Top 658 -Width 340 -Height 84 -Text 'Validate and check clientRequestId' -Background '#72aef3' -Border '#2576df'
    VLine -Left 927 -Top 742 -Height 46
    ArrowDown -Left 919 -Top 788
    Box -Left 760 -Top 804 -Width 340 -Height 84 -Text 'Resolve location and find district' -Background '#1dc0b0' -Border '#0f8f83'
    VLine -Left 927 -Top 888 -Height 46
    ArrowDown -Left 919 -Top 934
    Box -Left 795 -Top 950 -Width 270 -Height 84 -Text 'Save Complaint Record' -Background '#139790' -Border '#0d6a66' -Color '#ffffff'
    VLine -Left 927 -Top 1034 -Height 46
    ArrowDown -Left 919 -Top 1080
    Box -Left 735 -Top 1096 -Width 390 -Height 92 -Text 'Create notification event and queue delivery' -Background '#d7cba7' -Border '#9f8d5d'
    VLine -Left 247 -Top 742 -Height 492
    HLine -Left 247 -Top 1234 -Width 340
    VLine -Left 927 -Top 1188 -Height 46
    HLine -Left 587 -Top 1234 -Width 340
    Pill -Left 445 -Top 1264 -Width 290 -Height 74 -Text 'End' -Border '#ef2323'
  ) -join "`n"
}

function Build-ComplaintUiHtml {
  @(
    PhoneFrame -Left 170 -Top 26 -Width 640 -Height 650 -Title 'Report Issue'
    Box -Left 225 -Top 120 -Width 110 -Height 48 -Text 'Water' -Background '#d9e7ff' -Border '#2576df' -Size 18 -BorderWidth 3 -Radius 10
    Box -Left 350 -Top 120 -Width 110 -Height 48 -Text 'Roads' -Background '#eef4ff' -Border '#2576df' -Size 18 -BorderWidth 3 -Radius 10
    Box -Left 475 -Top 120 -Width 130 -Height 48 -Text 'Lighting' -Background '#eef4ff' -Border '#2576df' -Size 18 -BorderWidth 3 -Radius 10
    Box -Left 620 -Top 120 -Width 110 -Height 48 -Text 'Waste' -Background '#eef4ff' -Border '#2576df' -Size 18 -BorderWidth 3 -Radius 10
    Box -Left 230 -Top 196 -Width 520 -Height 170 -Text "Describe the issue`n`nExample: Water leak near school gate" -Background '#ffffff' -Border '#2576df' -Size 20 -BorderWidth 3 -Radius 14
    Box -Left 230 -Top 390 -Width 520 -Height 120 -Text "Captured location`nLat / Lng + image upload readiness" -Background '#ffffff' -Border '#111111' -Size 18 -BorderWidth 2 -Radius 16
    Pill -Left 305 -Top 548 -Width 215 -Height 70 -Text 'Save Offline' -Border '#0b9a27' -Size 22 -BorderWidth 5
    Pill -Left 540 -Top 548 -Width 190 -Height 70 -Text 'Submit Now' -Border '#ef2323' -Size 22 -BorderWidth 5
  ) -join "`n"
}

function Build-NotificationFlowHtml {
  @(
    Pill -Left 445 -Top 20 -Width 300 -Height 74 -Text 'Complaint Event' -Border '#4ba600'
    VLine -Left 592 -Top 94 -Height 46
    ArrowDown -Left 584 -Top 140
    Box -Left 390 -Top 156 -Width 420 -Height 82 -Text "Save Notification`nEvent Record" -Background '#6ea8eb' -Border '#2576df'
    VLine -Left 592 -Top 238 -Height 46
    ArrowDown -Left 584 -Top 284
    Box -Left 390 -Top 300 -Width 420 -Height 82 -Text 'Enqueue Delivery Job' -Background '#2576df' -Border '#0f4ea5' -Color '#ffffff'
    VLine -Left 592 -Top 382 -Height 46
    ArrowDown -Left 584 -Top 428
    Box -Left 390 -Top 444 -Width 420 -Height 82 -Text 'Worker Reserves Job' -Background '#b6d5ff' -Border '#5d95ea'
    VLine -Left 592 -Top 526 -Height 46
    ArrowDown -Left 584 -Top 572
    Box -Left 390 -Top 588 -Width 420 -Height 82 -Text "Load Active`nUser Devices" -Background '#1dc0b0' -Border '#0f8f83'
    VLine -Left 592 -Top 670 -Height 48
    ArrowDown -Left 584 -Top 718
    Box -Left 490 -Top 734 -Width 220 -Height 94 -Text 'Devices found?' -Background '#ffffff' -Border '#111111' -Radius 4
    Label -Left 330 -Top 772 -Text 'No' -Size 20 -Width 60
    HLine -Left 250 -Top 779 -Width 240
    VLine -Left 250 -Top 779 -Height 140
    ArrowDown -Left 242 -Top 919
    Box -Left 110 -Top 936 -Width 280 -Height 86 -Text "Mark no_devices`nand save status" -Background '#eb6bd3' -Border '#c13aaa'
    Label -Left 730 -Top 772 -Text 'Yes' -Size 20 -Width 60
    HLine -Left 710 -Top 779 -Width 220
    VLine -Left 930 -Top 779 -Height 140
    ArrowDown -Left 922 -Top 919
    Box -Left 790 -Top 936 -Width 300 -Height 86 -Text "Push / fallback`ndelivery attempt" -Background '#d7cba7' -Border '#9f8d5d'
    VLine -Left 250 -Top 1022 -Height 88
    HLine -Left 250 -Top 1110 -Width 342
    VLine -Left 930 -Top 1022 -Height 88
    HLine -Left 592 -Top 1110 -Width 338
    Box -Left 395 -Top 1128 -Width 410 -Height 86 -Text "Update delivery status, attempts, and timestamps" -Background '#ffe34b' -Border '#d1b400'
    VLine -Left 592 -Top 1214 -Height 46
    ArrowDown -Left 584 -Top 1260
    Box -Left 395 -Top 1276 -Width 410 -Height 86 -Text "Citizen refreshes Updates screen" -Background '#9c8f70' -Border '#6f6143' -Color '#ffffff'
    VLine -Left 592 -Top 1362 -Height 46
    ArrowDown -Left 584 -Top 1408
    Pill -Left 480 -Top 1426 -Width 230 -Height 72 -Text 'End' -Border '#ef2323'
  ) -join "`n"
}

function Build-NotificationUiHtml {
  @(
    PhoneFrame -Left 170 -Top 24 -Width 640 -Height 700 -Title 'Updates'
    Label -Left 250 -Top 120 -Text 'Status changes and complaint confirmations' -Size 18 -Width 480 -Align center
    Box -Left 220 -Top 165 -Width 540 -Height 126 -Text "Complaint received`nYour report was saved and is waiting for district review.`njust now" -Background '#ffffff' -Border '#111111' -BorderWidth 2 -Size 19 -Radius 16
    Box -Left 220 -Top 320 -Width 540 -Height 126 -Text "Complaint status updated`nWater issue is now resolved.`n2 hr ago" -Background '#ffffff' -Border '#111111' -BorderWidth 2 -Size 19 -Radius 16
    Box -Left 220 -Top 475 -Width 540 -Height 126 -Text "Complaint status updated`nRoad repair request is now in progress.`n1 day ago" -Background '#ffffff' -Border '#111111' -BorderWidth 2 -Size 19 -Radius 16
    Pill -Left 355 -Top 640 -Width 270 -Height 46 -Text 'Pull to refresh / Reload' -Border '#2576df' -Size 16 -BorderWidth 4
  ) -join "`n"
}

function Build-ErdHtml {
  @(
    Label -Left 55 -Top 26 -Text 'Entity Relationship Diagram' -Size 28 -Width 380
    Box -Left 80 -Top 95 -Width 220 -Height 150 -Text "USERS`nid (PK)`nfullName`nemail / phone`nrole`ndistrictId" -Background '#d9e7ff' -Border '#2576df' -Size 20
    Box -Left 420 -Top 85 -Width 250 -Height 190 -Text "COMPLAINTS`nid (PK)`ndescription`ncategory`nstatus`ndistrictId (FK)`ncreatedById (FK)" -Background '#ffe34b' -Border '#d1b400' -Size 20
    Box -Left 820 -Top 100 -Width 220 -Height 140 -Text "DISTRICTS`nid (PK)`nname`nboundary" -Background '#b6d5ff' -Border '#5d95ea' -Size 20
    Box -Left 90 -Top 360 -Width 220 -Height 150 -Text "USER_DEVICES`nid (PK)`nuserId (FK)`nplatform`nfcmToken" -Background '#ea6bd4' -Border '#c13aaa' -Size 20
    Box -Left 420 -Top 345 -Width 250 -Height 185 -Text "NOTIFICATION_EVENTS`nid (PK)`nuserId (FK)`ncomplaintId (FK)`ntitle`ndeliveryStatus" -Background '#1dc0b0' -Border '#0f8f83' -Size 19
    Box -Left 820 -Top 370 -Width 220 -Height 140 -Text "QUEUE_JOBS`nid (PK)`ntype`nstatus`npayload" -Background '#d7cba7' -Border '#9f8d5d' -Size 20
    HLine -Left 300 -Top 165 -Width 120
    ArrowRight -Left 420 -Top 152
    Label -Left 330 -Top 132 -Text 'creates many' -Size 16 -Width 110
    HLine -Left 670 -Top 165 -Width 150
    ArrowRight -Left 820 -Top 152
    Label -Left 705 -Top 132 -Text 'belongs to one' -Size 16 -Width 130
    VLine -Left 190 -Top 245 -Height 115
    ArrowDown -Left 182 -Top 360
    Label -Left 110 -Top 286 -Text 'owns many' -Size 16 -Width 120
    VLine -Left 545 -Top 275 -Height 70
    ArrowDown -Left 537 -Top 345
    Label -Left 450 -Top 300 -Text 'triggers many' -Size 16 -Width 150
    HLine -Left 670 -Top 430 -Width 150
    ArrowRight -Left 820 -Top 417
    Label -Left 703 -Top 396 -Text 'queues delivery' -Size 16 -Width 130
    HLine -Left 310 -Top 430 -Width 110
    ArrowRight -Left 420 -Top 417
    Label -Left 322 -Top 396 -Text 'notifies' -Size 16 -Width 90
  ) -join "`n"
}

function Write-DiagramSet {
  param([string]$MediaDir)

  $diagrams = @(
    @{ File = 'mycity_org_chart.png'; Width = 1200; Height = 720; Html = (Build-OrgChartHtml) }
    @{ File = 'mycity_auth_flow.png'; Width = 1200; Height = 1405; Html = (Build-AuthFlowHtml) }
    @{ File = 'mycity_auth_ui.png'; Width = 980; Height = 680; Html = (Build-AuthUiHtml) }
    @{ File = 'mycity_complaint_flow.png'; Width = 1200; Height = 1360; Html = (Build-ComplaintFlowHtml) }
    @{ File = 'mycity_complaint_ui.png'; Width = 980; Height = 710; Html = (Build-ComplaintUiHtml) }
    @{ File = 'mycity_notification_flow.png'; Width = 1200; Height = 1520; Html = (Build-NotificationFlowHtml) }
    @{ File = 'mycity_notification_ui.png'; Width = 980; Height = 760; Html = (Build-NotificationUiHtml) }
    @{ File = 'mycity_erd.png'; Width = 1120; Height = 590; Html = (Build-ErdHtml) }
  )

  foreach ($diagram in $diagrams) {
    $html = PageHtml -Width $diagram.Width -Height $diagram.Height -Parts @($diagram.Html)
    Render-HtmlToPng -Html $html -Width $diagram.Width -Height $diagram.Height -OutputPath (Join-Path $MediaDir $diagram.File)
  }
}

function Update-PackageLinks {
  param([string]$PackageRoot)

  $relsPath = Join-Path $PackageRoot 'word\_rels\document.xml.rels'
  $contentTypesPath = Join-Path $PackageRoot '[Content_Types].xml'

  $relsXml = Get-Content -Raw $relsPath
  $relsXml = $relsXml -replace 'mycity_org_chart\.svg', 'mycity_org_chart.png'
  $relsXml = $relsXml -replace 'mycity_auth_flow\.svg', 'mycity_auth_flow.png'
  $relsXml = $relsXml -replace 'mycity_auth_ui\.svg', 'mycity_auth_ui.png'
  $relsXml = $relsXml -replace 'mycity_complaint_flow\.svg', 'mycity_complaint_flow.png'
  $relsXml = $relsXml -replace 'mycity_complaint_ui\.svg', 'mycity_complaint_ui.png'
  $relsXml = $relsXml -replace 'mycity_notification_flow\.svg', 'mycity_notification_flow.png'
  $relsXml = $relsXml -replace 'mycity_notification_ui\.svg', 'mycity_notification_ui.png'
  $relsXml = $relsXml -replace 'mycity_erd\.svg', 'mycity_erd.png'
  Set-Content -LiteralPath $relsPath -Value $relsXml -Encoding UTF8

  $contentTypesXml = Get-Content -Raw -LiteralPath $contentTypesPath
  if ($contentTypesXml -notmatch 'Extension="png"') {
    $contentTypesXml = $contentTypesXml -replace '<Default Extension="jpeg" ContentType="image/jpeg"/>', '<Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/>'
    Set-Content -LiteralPath $contentTypesPath -Value $contentTypesXml -Encoding UTF8
  }
}

function Repack-Docx {
  param(
    [string]$PackageRoot,
    [string]$OutputDocx
  )

  $parent = Split-Path $OutputDocx -Parent
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }
  if (Test-Path $OutputDocx) {
    Remove-Item -LiteralPath $OutputDocx -Force
  }

  $zipPath = [System.IO.Path]::ChangeExtension($OutputDocx, '.zip')
  if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  Push-Location $PackageRoot
  try {
    Compress-Archive -Path * -DestinationPath $zipPath -Force
  }
  finally {
    Pop-Location
  }

  Move-Item -LiteralPath $zipPath -Destination $OutputDocx -Force
}

$mediaDir = Join-Path $PackageRoot 'word\media'
Write-DiagramSet -MediaDir $mediaDir
Update-PackageLinks -PackageRoot $PackageRoot
Repack-Docx -PackageRoot $PackageRoot -OutputDocx $OutputDocx

Write-Output "Created $OutputDocx"
