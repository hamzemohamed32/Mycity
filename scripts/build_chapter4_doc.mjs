import fs from 'node:fs';
import path from 'node:path';

const documentXmlPath = process.argv[2];
const coreXmlPath = process.argv[3];

if (!documentXmlPath) {
  console.error('Usage: node scripts/build_chapter4_doc.mjs <document.xml> [core.xml]');
  process.exit(1);
}

const wordDir = path.dirname(documentXmlPath);
const packageDir = path.dirname(wordDir);
const relsPath = path.join(wordDir, '_rels', 'document.xml.rels');
const mediaDir = path.join(wordDir, 'media');
const contentTypesPath = path.join(packageDir, '[Content_Types].xml');

const pxToEmu = (px) => Math.round(px * 9525);

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const originalDocumentXml = fs.readFileSync(documentXmlPath, 'utf8');
const startMatch = originalDocumentXml.match(/<\?xml[\s\S]*?<w:body>/);
const endMatch = originalDocumentXml.match(/<w:sectPr[\s\S]*<\/w:sectPr><\/w:body><\/w:document>\s*$/);

if (!startMatch || !endMatch) {
  console.error('Unable to find the document wrapper in the template document.xml');
  process.exit(1);
}

const documentStart = startMatch[0];
const documentEnd = endMatch[0];

const svgText = (x, y, lines, options = {}) => {
  const list = Array.isArray(lines) ? lines : [lines];
  const anchor = options.anchor ?? 'middle';
  const size = options.size ?? 26;
  const weight = options.weight ?? 700;
  const fill = options.fill ?? '#111111';
  const family = options.family ?? "'Courier New', monospace";
  const lineHeight = options.lineHeight ?? 1.18;
  const startY = y - ((list.length - 1) * size * lineHeight) / 2;
  const tspans = list
    .map((line, index) => {
      const dy = index === 0 ? 0 : size * lineHeight;
      return `<tspan x="${x}" y="${startY}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join('');
  return `<text x="${x}" y="${startY}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${tspans}</text>`;
};

const roundedBox = (x, y, width, height, label, options = {}) => {
  const fill = options.fill ?? '#d9e7ff';
  const stroke = options.stroke ?? '#0b9a27';
  const strokeWidth = options.strokeWidth ?? 4;
  const radius = options.radius ?? 18;
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
    svgText(x + width / 2, y + height / 2, label, {
      size: options.size ?? 24,
      fill: options.textFill ?? '#111111',
      anchor: 'middle',
    }),
  ].join('');
};

const plainRect = (x, y, width, height, label, options = {}) => {
  const fill = options.fill ?? '#d9e7ff';
  const stroke = options.stroke ?? '#0b9a27';
  const strokeWidth = options.strokeWidth ?? 4;
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="${options.radius ?? 12}" ry="${options.radius ?? 12}"/>`,
    svgText(x + width / 2, y + height / 2, label, {
      size: options.size ?? 24,
      fill: options.textFill ?? '#111111',
      anchor: 'middle',
    }),
  ].join('');
};

const terminalBox = (x, y, width, height, label, options = {}) =>
  roundedBox(x, y, width, height, label, {
    fill: options.fill ?? '#ffffff',
    stroke: options.stroke ?? '#67a9f0',
    strokeWidth: options.strokeWidth ?? 8,
    radius: options.radius ?? height / 2,
    size: options.size ?? 28,
  });

const diamond = (x, y, width, height, label, options = {}) => {
  const fill = options.fill ?? '#ffffff';
  const stroke = options.stroke ?? '#111111';
  const strokeWidth = options.strokeWidth ?? 3;
  const points = [
    `${x + width / 2},${y}`,
    `${x + width},${y + height / 2}`,
    `${x + width / 2},${y + height}`,
    `${x},${y + height / 2}`,
  ].join(' ');
  return [
    `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,
    svgText(x + width / 2, y + height / 2, label, {
      size: options.size ?? 24,
      fill: options.textFill ?? '#111111',
      anchor: 'middle',
    }),
  ].join('');
};

const line = (points, options = {}) => {
  const stroke = options.stroke ?? '#454c57';
  const strokeWidth = options.strokeWidth ?? 5;
  const joined = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polyline points="${joined}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>`;
};

const guide = (points, options = {}) => {
  const stroke = options.stroke ?? '#454c57';
  const strokeWidth = options.strokeWidth ?? 5;
  const joined = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polyline points="${joined}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

const labelText = (x, y, text, options = {}) =>
  svgText(x, y, text, {
    anchor: options.anchor ?? 'start',
    size: options.size ?? 24,
    weight: options.weight ?? 700,
    fill: options.fill ?? '#111111',
    family: options.family ?? "'Arial', sans-serif",
  });

const svgDoc = (width, height, inner) => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L12,6 L0,12 z" fill="#454c57"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${inner}
</svg>
`;

const createOrgChartSvg = () =>
  svgDoc(
    1200,
    720,
    [
      labelText(210, 95, ['organizational chart', 'MyCity Smart City'], {
        anchor: 'start',
        size: 34,
        family: "'Courier New', monospace",
      }),
      terminalBox(700, 28, 200, 82, 'System Admin'),
      guide([
        [800, 110],
        [800, 150],
      ], { stroke: '#ef2323' }),
      roundedBox(670, 150, 260, 88, 'City Administrator', {
        fill: '#ffffff',
        stroke: '#56c95d',
        strokeWidth: 8,
        radius: 40,
        size: 26,
      }),
      guide([
        [800, 238],
        [800, 305],
        [120, 305],
        [120, 330],
        [1040, 330],
        [1040, 305],
      ]),
      guide([
        [260, 305],
        [260, 380],
      ]),
      guide([
        [520, 305],
        [520, 380],
      ]),
      guide([
        [800, 305],
        [800, 380],
      ]),
      guide([
        [960, 305],
        [960, 380],
      ]),
      guide([
        [1100, 305],
        [1100, 380],
      ]),
      plainRect(40, 380, 170, 88, ['Citizen', 'Users'], { fill: '#cfd0fa', size: 24 }),
      plainRect(230, 380, 180, 88, ['District', 'Admin'], { fill: '#b6d5ff', size: 24 }),
      plainRect(430, 380, 180, 88, ['Complaint', 'Operations'], { fill: '#1dc0b0', size: 24 }),
      plainRect(700, 380, 190, 88, ['Platform', 'Support'], { fill: '#d7cba7', size: 24 }),
      plainRect(940, 380, 220, 88, ['Notification', 'and API Team'], { fill: '#ea6bd4', size: 24 }),
      guide([
        [125, 468],
        [125, 520],
        [85, 520],
      ], { stroke: '#d85a00' }),
      line([
        [85, 520],
        [85, 575],
        [135, 575],
      ], { stroke: '#d85a00' }),
      line([
        [85, 520],
        [85, 660],
        [135, 660],
      ], { stroke: '#d85a00' }),
      plainRect(40, 540, 190, 80, ['Issue', 'Reporters'], { fill: '#8f8bec', size: 22 }),
      plainRect(40, 625, 190, 80, ['Community', 'Supporters'], { fill: '#6357ef', size: 22 }),
      guide([
        [320, 468],
        [320, 520],
        [290, 520],
      ], { stroke: '#d38cff' }),
      line([
        [290, 520],
        [290, 575],
        [430, 575],
      ], { stroke: '#d38cff' }),
      line([
        [290, 520],
        [290, 660],
        [430, 660],
      ], { stroke: '#d38cff' }),
      plainRect(430, 540, 160, 80, ['Status', 'Control'], { fill: '#69a0e7', size: 22 }),
      plainRect(430, 625, 185, 80, ['District', 'Queues'], { fill: '#2775db', size: 22 }),
      guide([
        [800, 468],
        [800, 520],
        [770, 520],
      ], { stroke: '#2371d8' }),
      line([
        [770, 520],
        [770, 575],
        [875, 575],
      ], { stroke: '#2371d8' }),
      plainRect(745, 540, 185, 80, ['Geo Routing', 'and Review'], { fill: '#139790', size: 22 }),
      guide([
        [1035, 468],
        [1035, 520],
        [1005, 520],
      ], { stroke: '#d38cff' }),
      line([
        [1005, 520],
        [1005, 575],
        [1085, 575],
      ], { stroke: '#d38cff' }),
      plainRect(995, 540, 145, 80, ['Push and', 'Updates'], { fill: '#b720f0', size: 22 }),
    ].join(''),
  );

const createAuthFlowSvg = () =>
  svgDoc(
    1200,
    1380,
    [
      terminalBox(450, 30, 300, 82, 'Start'),
      guide([
        [600, 112],
        [600, 150],
      ], { stroke: '#ef2323' }),
      plainRect(370, 150, 460, 88, 'Open Login/Register Page', { fill: '#6ea8eb', size: 24 }),
      line([
        [600, 238],
        [600, 300],
      ]),
      plainRect(370, 300, 460, 88, 'User selects Register or Login', { fill: '#2576df', size: 24 }),
      labelText(120, 435, 'Register', { size: 34, family: "'Courier New', monospace" }),
      labelText(915, 420, 'Login', { size: 34, family: "'Courier New', monospace" }),
      line([
        [370, 344],
        [280, 344],
        [280, 505],
      ]),
      line([
        [830, 344],
        [960, 344],
        [960, 485],
      ]),
      plainRect(175, 470, 210, 70, 'Register', { fill: '#d0cff8', size: 22 }),
      line([
        [280, 540],
        [280, 600],
      ], { stroke: '#d85a00' }),
      plainRect(175, 600, 210, 70, 'Enter Details', { fill: '#8d89ef', size: 22 }),
      line([
        [280, 670],
        [280, 730],
      ], { stroke: '#d85a00' }),
      plainRect(175, 730, 210, 70, 'Validate Input', { fill: '#655bf0', size: 22 }),
      line([
        [960, 555],
        [960, 615],
      ], { stroke: '#d38cff' }),
      plainRect(860, 485, 210, 70, 'Login', { fill: '#c7daf8', size: 22 }),
      plainRect(830, 615, 270, 82, ['Enter Email / Phone', 'and Password'], { fill: '#72aef3', size: 22 }),
      line([
        [960, 697],
        [960, 760],
      ], { stroke: '#d38cff' }),
      plainRect(830, 760, 270, 88, ['Validate', 'Credentials'], { fill: '#2576df', size: 22 }),
      diamond(280, 845, 190, 110, 'Valid ?', { size: 22 }),
      diamond(860, 845, 190, 110, 'Valid ?', { size: 22 }),
      line([
        [280, 800],
        [280, 845],
      ]),
      line([
        [960, 848],
        [960, 845],
      ]),
      labelText(370, 875, 'No', { size: 22 }),
      line([
        [280, 900],
        [280, 930],
        [120, 930],
      ]),
      plainRect(20, 850, 170, 92, 'Show Error', { fill: '#5ac45a', size: 22 }),
      line([
        [1050, 900],
        [1140, 900],
      ]),
      plainRect(1030, 850, 150, 92, 'Show Error', { fill: '#eb6bd3', size: 22 }),
      labelText(490, 910, 'yes', { size: 22 }),
      plainRect(250, 980, 210, 95, ['Save User', 'Record'], { fill: '#ffe34b', size: 22 }),
      line([
        [375, 955],
        [375, 980],
      ]),
      plainRect(815, 980, 210, 95, ['Create', 'Session'], { fill: '#d8cda9', size: 22 }),
      labelText(1050, 910, 'No', { size: 22 }),
      labelText(855, 910, 'yes', { size: 22 }),
      line([
        [920, 955],
        [920, 980],
      ]),
      plainRect(245, 1095, 220, 92, ['Success', 'Message'], { fill: '#ffd529', size: 22 }),
      line([
        [355, 1075],
        [355, 1095],
      ]),
      plainRect(795, 1095, 250, 92, ['Redirect to', 'Home Map'], { fill: '#9c8f70', size: 22 }),
      line([
        [920, 1075],
        [920, 1095],
      ]),
      guide([
        [355, 1187],
        [355, 1250],
        [600, 1250],
        [920, 1250],
        [920, 1187],
      ]),
      terminalBox(450, 1260, 300, 82, 'End', { stroke: '#ef2323' }),
    ].join(''),
  );

const createAuthUiSvg = () =>
  svgDoc(
    980,
    680,
    [
      `<rect x="210" y="30" width="560" height="620" rx="28" ry="28" fill="#ffffff" stroke="#111111" stroke-width="3"/>`,
      svgText(490, 105, 'MyCity', { size: 34, family: "'Courier New', monospace" }),
      labelText(280, 150, 'Create account / Sign in', { size: 20 }),
      plainRect(275, 190, 430, 70, 'Full name', { fill: '#eef4ff', stroke: '#2576df', size: 20, radius: 10 }),
      plainRect(275, 285, 430, 70, 'Email or phone', { fill: '#eef4ff', stroke: '#2576df', size: 20, radius: 10 }),
      plainRect(275, 380, 430, 70, 'Password', { fill: '#eef4ff', stroke: '#2576df', size: 20, radius: 10 }),
      roundedBox(320, 495, 340, 82, 'Create account / Sign in', {
        fill: '#ffffff',
        stroke: '#ef2323',
        strokeWidth: 6,
        radius: 40,
        size: 24,
      }),
      roundedBox(345, 595, 290, 55, 'Switch mode', {
        fill: '#111111',
        stroke: '#111111',
        strokeWidth: 2,
        radius: 10,
        size: 18,
        textFill: '#ffffff',
      }),
      labelText(85, 135, 'AUTH PAGE', { size: 22, fill: '#ffffff' }),
      `<rect x="40" y="92" width="160" height="52" rx="8" ry="8" fill="#111111"/>`,
    ].join(''),
  );

const createComplaintFlowSvg = () =>
  svgDoc(
    1200,
    1380,
    [
      terminalBox(465, 24, 270, 80, 'Start', { stroke: '#4ba600' }),
      line([
        [600, 104],
        [600, 160],
      ]),
      plainRect(360, 160, 480, 86, 'Open Report Issue Screen', { fill: '#6ea8eb', size: 24 }),
      line([
        [600, 246],
        [600, 315],
      ]),
      plainRect(360, 315, 480, 86, 'Select Category and Enter Description', { fill: '#2576df', size: 24 }),
      line([
        [600, 401],
        [600, 470],
      ]),
      diamond(475, 470, 250, 110, 'Save offline?', { size: 22 }),
      line([
        [475, 525],
        [230, 525],
        [230, 620],
      ]),
      labelText(345, 500, 'Yes', { size: 22 }),
      plainRect(105, 620, 250, 90, ['Queue Local', 'Complaint'], { fill: '#8f8bec', size: 24 }),
      line([
        [725, 525],
        [980, 525],
        [980, 620],
      ]),
      labelText(760, 500, 'No', { size: 22 }),
      plainRect(845, 620, 270, 90, ['Validate and Check', 'clientRequestId'], { fill: '#72aef3', size: 22 }),
      line([
        [980, 710],
        [980, 790],
      ]),
      plainRect(830, 790, 300, 90, ['Resolve Location and', 'Find District'], { fill: '#1dc0b0', size: 22 }),
      line([
        [980, 880],
        [980, 960],
      ]),
      plainRect(845, 960, 270, 90, ['Save Complaint', 'Record'], { fill: '#139790', size: 22 }),
      line([
        [980, 1050],
        [980, 1130],
      ]),
      plainRect(815, 1130, 330, 90, ['Create Notification Event', 'and Queue Delivery'], { fill: '#d7cba7', size: 22 }),
      guide([
        [230, 710],
        [230, 1270],
        [600, 1270],
      ]),
      guide([
        [980, 1220],
        [980, 1270],
        [600, 1270],
      ]),
      terminalBox(455, 1280, 290, 80, 'End', { stroke: '#ef2323' }),
    ].join(''),
  );

const createComplaintUiSvg = () =>
  svgDoc(
    980,
    710,
    [
      `<rect x="170" y="26" width="640" height="650" rx="28" ry="28" fill="#ffffff" stroke="#111111" stroke-width="3"/>`,
      svgText(490, 85, 'Report Issue', { size: 32, family: "'Courier New', monospace" }),
      roundedBox(220, 120, 120, 54, 'Water', { fill: '#d9e7ff', stroke: '#2576df', strokeWidth: 3, radius: 12, size: 20 }),
      roundedBox(355, 120, 120, 54, 'Roads', { fill: '#eef4ff', stroke: '#2576df', strokeWidth: 3, radius: 12, size: 20 }),
      roundedBox(490, 120, 140, 54, 'Lighting', { fill: '#eef4ff', stroke: '#2576df', strokeWidth: 3, radius: 12, size: 20 }),
      roundedBox(645, 120, 120, 54, 'Waste', { fill: '#eef4ff', stroke: '#2576df', strokeWidth: 3, radius: 12, size: 20 }),
      plainRect(230, 205, 520, 165, ['Describe the issue', '', 'Example: Water leak near school gate'], {
        fill: '#ffffff',
        stroke: '#2576df',
        strokeWidth: 3,
        size: 22,
        radius: 14,
      }),
      plainRect(230, 395, 520, 120, ['Captured location', 'Lat / Lng + image upload readiness'], {
        fill: '#ffffff',
        stroke: '#111111',
        strokeWidth: 2,
        size: 20,
        radius: 18,
      }),
      roundedBox(310, 555, 210, 70, 'Save Offline', {
        fill: '#ffffff',
        stroke: '#0b9a27',
        strokeWidth: 5,
        radius: 35,
        size: 24,
      }),
      roundedBox(545, 555, 190, 70, 'Submit Now', {
        fill: '#ffffff',
        stroke: '#ef2323',
        strokeWidth: 5,
        radius: 35,
        size: 24,
      }),
    ].join(''),
  );

const createNotificationFlowSvg = () =>
  svgDoc(
    1200,
    1580,
    [
      terminalBox(455, 24, 290, 80, 'Complaint Event', { stroke: '#4ba600' }),
      line([
        [600, 104],
        [600, 165],
      ]),
      plainRect(390, 165, 420, 86, ['Save Notification', 'Event Record'], { fill: '#6ea8eb', size: 24 }),
      line([
        [600, 251],
        [600, 325],
      ]),
      plainRect(390, 325, 420, 86, 'Enqueue Delivery Job', { fill: '#2576df', size: 24 }),
      line([
        [600, 411],
        [600, 485],
      ]),
      plainRect(390, 485, 420, 86, 'Worker Reserves Job', { fill: '#b6d5ff', size: 24 }),
      line([
        [600, 571],
        [600, 645],
      ]),
      plainRect(390, 645, 420, 86, ['Load Active', 'User Devices'], { fill: '#1dc0b0', size: 24 }),
      line([
        [600, 731],
        [600, 805],
      ]),
      diamond(490, 805, 220, 110, 'Devices found?', { size: 22 }),
      line([
        [490, 860],
        [255, 860],
        [255, 960],
      ]),
      labelText(365, 835, 'No', { size: 22 }),
      plainRect(120, 960, 270, 92, ['Mark no_devices', 'and save status'], { fill: '#eb6bd3', size: 22 }),
      line([
        [710, 860],
        [945, 860],
        [945, 960],
      ]),
      labelText(715, 835, 'Yes', { size: 22 }),
      plainRect(800, 960, 290, 92, ['Push / fallback', 'delivery attempt'], { fill: '#d7cba7', size: 22 }),
      guide([
        [255, 1052],
        [255, 1140],
        [600, 1140],
      ]),
      guide([
        [945, 1052],
        [945, 1140],
        [600, 1140],
      ]),
      plainRect(415, 1140, 370, 92, ['Update delivery status,', 'attempts, and timestamps'], {
        fill: '#ffe34b',
        size: 22,
      }),
      line([
        [600, 1232],
        [600, 1310],
      ]),
      plainRect(405, 1310, 390, 92, ['Citizen refreshes', 'Updates screen'], { fill: '#9c8f70', size: 22 }),
      line([
        [600, 1402],
        [600, 1475],
      ]),
      terminalBox(485, 1475, 230, 78, 'End', { stroke: '#ef2323' }),
    ].join(''),
  );

const createNotificationUiSvg = () =>
  svgDoc(
    980,
    760,
    [
      `<rect x="170" y="26" width="640" height="700" rx="28" ry="28" fill="#ffffff" stroke="#111111" stroke-width="3"/>`,
      svgText(490, 85, 'Updates', { size: 34, family: "'Courier New', monospace" }),
      labelText(260, 125, 'Status changes and complaint confirmations', { size: 19 }),
      plainRect(215, 165, 550, 135, ['Complaint received', 'Your report was saved and is waiting for district review.', 'just now'], {
        fill: '#ffffff',
        stroke: '#111111',
        strokeWidth: 2,
        size: 22,
        radius: 16,
      }),
      plainRect(215, 330, 550, 135, ['Complaint status updated', 'Water issue is now resolved.', '2 hr ago'], {
        fill: '#ffffff',
        stroke: '#111111',
        strokeWidth: 2,
        size: 22,
        radius: 16,
      }),
      plainRect(215, 495, 550, 135, ['Complaint status updated', 'Road repair request is now in progress.', '1 day ago'], {
        fill: '#ffffff',
        stroke: '#111111',
        strokeWidth: 2,
        size: 22,
        radius: 16,
      }),
      roundedBox(355, 655, 270, 48, 'Pull to refresh / Reload', {
        fill: '#111111',
        stroke: '#111111',
        strokeWidth: 2,
        radius: 8,
        size: 18,
        textFill: '#ffffff',
      }),
    ].join(''),
  );

const createErdSvg = () =>
  svgDoc(
    1200,
    720,
    [
      plainRect(70, 80, 180, 90, ['USERS', 'id, fullName, role'], { fill: '#cfd0fa', size: 22 }),
      plainRect(350, 70, 220, 110, ['COMPLAINTS', 'id, category, status,', 'location, districtId'], {
        fill: '#1dc0b0',
        size: 22,
      }),
      plainRect(780, 80, 190, 90, ['DISTRICTS', 'id, name, boundary'], { fill: '#d7cba7', size: 22 }),
      plainRect(70, 280, 210, 90, ['USER_DEVICES', 'id, userId, fcmToken'], { fill: '#8f8bec', size: 22 }),
      plainRect(350, 280, 220, 90, ['COMMENTS', 'id, complaintId, authorId'], { fill: '#69a0e7', size: 22 }),
      plainRect(670, 270, 250, 110, ['NOTIFICATION_EVENTS', 'id, userId, complaintId,', 'deliveryStatus'], {
        fill: '#ea6bd4',
        size: 22,
      }),
      plainRect(970, 280, 170, 90, ['QUEUE_JOBS', 'id, type, payload'], { fill: '#ffd529', size: 22 }),
      plainRect(350, 500, 220, 90, ['REACTIONS', 'id, complaintId, userId'], { fill: '#b6d5ff', size: 22 }),
      line([
        [250, 125],
        [350, 125],
      ]),
      labelText(285, 108, '1..*', { size: 20 }),
      line([
        [570, 125],
        [780, 125],
      ]),
      labelText(675, 108, '*..1', { size: 20 }),
      line([
        [160, 170],
        [160, 280],
      ]),
      labelText(175, 222, '1..*', { size: 20 }),
      line([
        [455, 180],
        [455, 280],
      ]),
      labelText(472, 230, '1..*', { size: 20 }),
      line([
        [455, 390],
        [455, 500],
      ]),
      labelText(472, 445, '1..*', { size: 20 }),
      line([
        [570, 125],
        [670, 125],
        [670, 325],
      ]),
      labelText(625, 108, '1..*', { size: 20 }),
      line([
        [570, 325],
        [670, 325],
      ]),
      labelText(622, 308, '*..1', { size: 20 }),
      line([
        [920, 325],
        [970, 325],
      ]),
      labelText(936, 308, '1..*', { size: 20 }),
      labelText(600, 30, 'Entity Relationship Diagram - MyCity', {
        anchor: 'middle',
        size: 30,
        family: "'Courier New', monospace",
      }),
    ].join(''),
  );

const diagrams = [
  {
    key: 'orgChart',
    file: 'mycity_org_chart.svg',
    title: 'Figure 1. MyCity organizational chart',
    width: pxToEmu(650),
    height: pxToEmu(390),
    svg: createOrgChartSvg(),
  },
  {
    key: 'authFlow',
    file: 'mycity_auth_flow.svg',
    title: 'Figure 2. Detailed logical design of user registration and login',
    width: pxToEmu(650),
    height: pxToEmu(710),
    svg: createAuthFlowSvg(),
  },
  {
    key: 'authUi',
    file: 'mycity_auth_ui.svg',
    title: 'Figure 3. Design of user registration and login',
    width: pxToEmu(560),
    height: pxToEmu(388),
    svg: createAuthUiSvg(),
  },
  {
    key: 'complaintFlow',
    file: 'mycity_complaint_flow.svg',
    title: 'Figure 4. Detailed logical design of complaint reporting and district assignment',
    width: pxToEmu(650),
    height: pxToEmu(736),
    svg: createComplaintFlowSvg(),
  },
  {
    key: 'complaintUi',
    file: 'mycity_complaint_ui.svg',
    title: 'Figure 5. Design of complaint reporting and district assignment',
    width: pxToEmu(560),
    height: pxToEmu(405),
    svg: createComplaintUiSvg(),
  },
  {
    key: 'notificationFlow',
    file: 'mycity_notification_flow.svg',
    title: 'Figure 6. Detailed logical design of notification and update tracking',
    width: pxToEmu(610),
    height: pxToEmu(790),
    svg: createNotificationFlowSvg(),
  },
  {
    key: 'notificationUi',
    file: 'mycity_notification_ui.svg',
    title: 'Figure 7. Design of notification and update tracking',
    width: pxToEmu(560),
    height: pxToEmu(434),
    svg: createNotificationUiSvg(),
  },
  {
    key: 'erd',
    file: 'mycity_erd.svg',
    title: 'Figure 8. Entity relationship diagram for MyCity',
    width: pxToEmu(650),
    height: pxToEmu(390),
    svg: createErdSvg(),
  },
];

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const originalRelsXml = fs.readFileSync(relsPath, 'utf8');
const relIds = [...originalRelsXml.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
let nextRelId = relIds.length ? Math.max(...relIds) + 1 : 20;
const newRelationships = [];

const diagramMap = {};
for (const diagram of diagrams) {
  const relId = `rId${nextRelId++}`;
  diagramMap[diagram.key] = { ...diagram, relId };
  fs.writeFileSync(path.join(mediaDir, diagram.file), diagram.svg, 'utf8');
  newRelationships.push(
    `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${diagram.file}"/>`,
  );
}

const updatedRelsXml = originalRelsXml.replace(
  '</Relationships>',
  `${newRelationships.join('')}</Relationships>`,
);
fs.writeFileSync(relsPath, updatedRelsXml, 'utf8');

const contentTypesXml = fs.readFileSync(contentTypesPath, 'utf8');
if (!contentTypesXml.includes('Extension="svg"')) {
  const updatedContentTypesXml = contentTypesXml.replace(
    '<Default Extension="png" ContentType="image/png"/>',
    '<Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/>',
  );
  fs.writeFileSync(contentTypesPath, updatedContentTypesXml, 'utf8');
}

let docPrId = 9000;
const imageParagraph = (diagram) => `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${diagram.width}" cy="${diagram.height}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId++}" name="${diagram.file}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${diagram.file}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${diagram.relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${diagram.width}" cy="${diagram.height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;

const run = (text, options = {}) => {
  const fonts = options.code
    ? '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>'
    : '';
  const bold = options.bold ? '<w:b/><w:bCs/>' : '';
  const italic = options.italic ? '<w:i/><w:iCs/>' : '';
  const noProof = options.noProof ? '<w:noProof/>' : '';
  const size = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '';
  const preserve = /^\s|\s$| {2,}/.test(text) ? ' xml:space="preserve"' : '';
  return `<w:r><w:rPr>${fonts}${bold}${italic}${noProof}${size}</w:rPr><w:t${preserve}>${escapeXml(text)}</w:t></w:r>`;
};

const paragraph = (text, options = {}) => {
  const style = options.style ? `<w:pStyle w:val="${options.style}"/>` : '';
  const spacing = options.spacing
    ? `<w:spacing w:before="${options.spacing.before ?? 0}" w:after="${options.spacing.after ?? 0}" w:line="${options.spacing.line ?? 278}" w:lineRule="auto"/>`
    : '';
  const indent = options.firstLine ? `<w:ind w:firstLine="${options.firstLine}"/>` : '';
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const keepNext = options.keepNext ? '<w:keepNext/>' : '';
  const keepLines = options.keepLines ? '<w:keepLines/>' : '';
  const pPr = style || spacing || indent || align || keepNext || keepLines
    ? `<w:pPr>${style}${keepNext}${keepLines}${spacing}${indent}${align}</w:pPr>`
    : '';

  const lines = String(text).split('\n');
  const runs = [];
  lines.forEach((lineValue, index) => {
    if (index > 0) {
      runs.push('<w:r><w:br/></w:r>');
    }
    runs.push(
      run(lineValue, {
        bold: options.bold,
        italic: options.italic,
        code: options.code,
        size: options.size,
        noProof: options.noProof,
      }),
    );
  });

  return `<w:p>${pPr}${runs.join('')}</w:p>`;
};

const emptyParagraph = () => '<w:p/>';
const pageBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const caption = (text) => paragraph(text, { style: 'Caption', align: 'center' });
const bodyParagraph = (text) =>
  paragraph(text, {
    spacing: { after: 160, line: 360 },
    firstLine: 720,
    align: 'both',
  });
const sectionHeading = (text, level = 2, centered = false) =>
  paragraph(text, {
    style: `Heading${level}`,
    align: centered ? 'center' : undefined,
    keepNext: true,
    keepLines: true,
  });

const simpleListItem = (label, description) =>
  paragraph(`${label}\n${description}`, {
    spacing: { after: 160, line: 360 },
    align: 'both',
  }).replace(
    '<w:rPr></w:rPr><w:t>',
    '<w:rPr><w:b/><w:bCs/></w:rPr><w:t>',
  );

const tableCell = (text, width, header = false) => {
  const content = Array.isArray(text) ? text.join('\n') : String(text);
  const lines = content.split('\n');
  const runs = [];
  lines.forEach((lineValue, index) => {
    if (index > 0) {
      runs.push('<w:r><w:br/></w:r>');
    }
    runs.push(run(lineValue, { bold: header }));
  });
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>${runs.join('')}</w:p></w:tc>`;
};

const table = (headers, rows, widths) => {
  const grid = widths.map((width) => `<w:gridCol w:w="${width}"/>`).join('');
  const headerRow = `<w:tr>${headers.map((header, index) => tableCell(header, widths[index], true)).join('')}</w:tr>`;
  const bodyRows = rows
    .map((row) => `<w:tr>${row.map((cell, index) => tableCell(cell, widths[index], false)).join('')}</w:tr>`)
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${widths.reduce((sum, width) => sum + width, 0)}" w:type="dxa"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${headerRow}${bodyRows}</w:tbl>`;
};

const figureBlock = (key) => `${imageParagraph(diagramMap[key])}${caption(diagramMap[key].title)}`;

const parts = [];

parts.push(sectionHeading('CHAPTER FOUR', 1, true));
parts.push(paragraph('MyCity Smart City Implementation', { align: 'center', bold: true }));
parts.push(emptyParagraph());

parts.push(sectionHeading('4.1 MyCity Smart City Platform Requirements', 2));
parts.push(bodyParagraph('This chapter presents the system requirements, analysis, design, and interface evidence of MyCity. The project is intentionally kept at a medium functional scope: citizen account access, complaint reporting, district-based routing, and notification updates. The write-up follows the Chapter Four guide while staying aligned to the actual codebase of the current project.'));

parts.push(sectionHeading('4.1.1 Organizational Chart', 3));
parts.push(figureBlock('orgChart'));
parts.push(bodyParagraph('The MyCity platform follows a civic operations hierarchy. The System Administrator manages platform configuration, security, and access control. The City Administrator oversees city-wide complaint performance and cross-district supervision. District Administrators review complaints inside their assigned districts and coordinate operational response. Platform support maintains backend, queue, and notification operations, while citizens act as the reporting users who submit issues, track progress, support complaints, and receive updates.'));

parts.push(sectionHeading('4.1.2 User Requirements', 3));
parts.push(bodyParagraph('The following requirements describe the major user groups of the MyCity platform, their expected interactions with the system, and the service-quality conditions the platform must satisfy.'));

parts.push(sectionHeading('4.1.2.1 Functional Requirements', 4));
parts.push(paragraph('A. Citizen Requirements', { bold: true, spacing: { after: 160, line: 360 } }));
parts.push(simpleListItem('i. Account Registration and Login:', 'Citizens must be able to create accounts, sign in with email or phone, and maintain an authenticated session in order to submit and track reports.'));
parts.push(simpleListItem('ii. Complaint Reporting:', 'Citizens must be able to submit a complaint by selecting a category, writing a description, attaching or preparing media, and providing a location for district routing.'));
parts.push(simpleListItem('iii. Offline Save and Sync:', 'Citizens must be able to save a complaint locally when connectivity is unavailable and sync it later without creating duplicates.'));
parts.push(simpleListItem('iv. Complaint Tracking:', 'Citizens must be able to browse the city service map, open complaint details, view district ownership, read comments, and support community issues.'));
parts.push(simpleListItem('v. Notifications and Updates:', 'Citizens must receive confirmations when complaints are created and later see updates when the complaint status changes.'));

parts.push(paragraph('B. District Administrator Requirements', { bold: true, spacing: { after: 160, line: 360 } }));
parts.push(simpleListItem('i. District-Scoped Complaint Review:', 'District administrators must view complaints assigned to their district and inspect details such as category, description, location, comments, and supporter count.'));
parts.push(simpleListItem('ii. Status Management:', 'District administrators must update complaint status values such as pending, in progress, and resolved so that citizens and supervisors can monitor service progress.'));
parts.push(simpleListItem('iii. Work Allocation Support:', 'District administrators must use complaint ownership and assignment fields to coordinate response activity and maintain accountability.'));

parts.push(paragraph('C. City and Platform Administration Requirements', { bold: true, spacing: { after: 160, line: 360 } }));
parts.push(simpleListItem('i. Cross-District Oversight:', 'City-level administrators must review complaint activity across districts and identify service bottlenecks or high-volume issue categories.'));
parts.push(simpleListItem('ii. User and Role Governance:', 'Platform administrators must manage roles such as citizen, district administrator, city administrator, and system administrator.'));
parts.push(simpleListItem('iii. Notification and Queue Monitoring:', 'Platform operations must observe notification delivery results and queue health so asynchronous updates remain reliable.'));

parts.push(sectionHeading('4.1.2.2 Non-Functional Requirements', 4));
parts.push(simpleListItem('i. Performance:', 'The system must keep complaint submission and complaint list retrieval fast even when many users access the platform at the same time.'));
parts.push(simpleListItem('ii. Security:', 'The platform must enforce JWT-based authentication, role-based access control, and protected access to district and administrative operations.'));
parts.push(simpleListItem('iii. Reliability:', 'Complaint writes must be durable, retries must be idempotent, and notification failures must not destroy the core complaint transaction.'));
parts.push(simpleListItem('iv. Usability:', 'The mobile interface must stay clear and low-friction so citizens can report issues quickly and understand status updates without confusion.'));
parts.push(simpleListItem('v. Scalability:', 'The architecture must scale toward large user populations through stateless APIs, queue-backed asynchronous work, caching, and geospatial database indexing.'));
parts.push(simpleListItem('vi. Offline Tolerance:', 'The citizen application must continue capturing complaint data during poor connectivity and replay queued complaints safely once service returns.'));

parts.push(pageBreak());
parts.push(sectionHeading('4.2 Requirement Analysis and Design', 2));
parts.push(bodyParagraph('For Assignment II, three medium-scope modules were selected from the implemented MyCity system: User Registration and Login, Complaint Reporting and District Assignment, and Notification and Update Tracking. These modules represent the main working flow of the project without expanding the report into unrelated or oversized features. Each module below follows the required structure of process analysis, detailed logical design, field analysis, design, and UI analysis.'));

parts.push(sectionHeading('4.2.1 User Registration and Login Module', 3));
parts.push(bodyParagraph('The User Registration and Login module is responsible for secure entry into the MyCity platform. It allows a citizen to create an account with a full name and either an email address or a phone number, and it also allows returning users to sign in with their chosen identifier and password. The module supports role-aware authentication because backend user records carry roles such as citizen, district administrator, city administrator, and system administrator.'));

parts.push(sectionHeading('4.2.1.1 Process Analysis of User Registration and Login', 4));
parts.push(paragraph([
  'Step 1: Start.',
  'Step 2: User opens the authentication screen.',
  'Step 3: If the user is new, they switch to Create account mode and enter Full name, Email or Phone, and Password.',
  'Step 4: The mobile app validates required fields before sending the request.',
  'Step 5: The backend validates the payload, hashes the password, stores the user record, and returns access and refresh tokens.',
  'Step 6: If the user already has an account, they enter Email or Phone plus Password on the Sign in form.',
  'Step 7: The backend verifies the credential pair against the stored user record.',
  'Step 8: If credentials are invalid, the system returns an error and the app shows a message.',
  'Step 9: If credentials are valid, the app stores the session and navigates to the main city map workspace.',
  'Step 10: End.',
].join('\n'), { spacing: { after: 160, line: 320 } }));

parts.push(sectionHeading('4.2.1.2 Detailed Logical Design of User Registration and Login', 4));
parts.push(figureBlock('authFlow'));

parts.push(sectionHeading('4.2.1.3 Field Analysis of User Registration and Login', 4));
parts.push(table(
  ['Field Name', 'Data Type', 'Size / Rule', 'Required', 'Auto Field', 'Key / Constraint'],
  [
    ['id', 'UUID', 'System generated', 'Yes', 'Yes', 'Primary Key'],
    ['fullName', 'Varchar', 'User full name', 'Yes', 'No', 'N/A'],
    ['email', 'Varchar', 'Email format', 'Optional', 'No', 'Unique when provided'],
    ['phone', 'Varchar', 'Phone format', 'Optional', 'No', 'Unique when provided'],
    ['password', 'Varchar', 'Minimum 8 characters, stored hashed', 'Yes', 'No', 'Protected field'],
    ['role', 'Enum', 'citizen / district_admin / city_admin / system_admin', 'Optional', 'No', 'Default citizen'],
    ['districtId', 'UUID', 'Linked district for scoped staff users', 'Optional', 'No', 'Foreign Key'],
    ['isActive', 'Boolean', 'true / false', 'Yes', 'System default', 'N/A'],
  ],
  [1900, 1200, 2300, 900, 1100, 1800],
));

parts.push(sectionHeading('4.2.1.4 Design of User Registration and Login', 4));
parts.push(figureBlock('authUi'));
parts.push(bodyParagraph('The interface uses one reusable screen for both registration and login. Register mode exposes the Full name input and changes the primary action text to Create account. Sign-in mode hides the name field and keeps the same identifier-plus-password structure. Validation feedback is delivered through snack bar messages so the interaction remains simple for first-time users.'));

parts.push(sectionHeading('4.2.1.5 UI Analysis of User Registration and Login', 4));
parts.push(table(
  ['Control Name', 'Control Type', 'Property', 'Value'],
  [
    ['Brand title', 'Text label', 'Caption', 'MyCity'],
    ['Mode subtitle', 'Text label', 'Content', 'Create account or sign in guidance'],
    ['Full name', 'TextField', 'Visible in register mode', 'Full name'],
    ['Email or phone', 'TextField', 'Identifier input', 'Email or phone'],
    ['Password', 'TextField', 'Secure entry', 'Password'],
    ['Primary action', 'FilledButton', 'Action', 'Create account / Sign in'],
    ['Mode switch', 'TextButton', 'Action', 'Toggle between register and sign in'],
    ['Feedback message', 'SnackBar', 'Purpose', 'Validation or error message'],
  ],
  [1900, 1500, 1700, 2960],
));

parts.push(pageBreak());
parts.push(sectionHeading('4.2.2 Complaint Reporting and District Assignment Module', 3));
parts.push(bodyParagraph('The Complaint Reporting and District Assignment module is the core workflow of the MyCity platform. It allows a citizen to describe a city issue, select a category, capture location information, and either submit the complaint immediately or save it offline for later synchronization. On the backend, the module creates a geospatial complaint record, checks for duplicate mobile retries using a client request id, and attempts district lookup using PostGIS boundary containment.'));

parts.push(sectionHeading('4.2.2.1 Process Analysis of Complaint Reporting and District Assignment', 4));
parts.push(paragraph([
  'Step 1: Start.',
  'Step 2: User taps Report issue from the mobile map workspace.',
  'Step 3: User selects a complaint category such as Water, Roads, Lighting, or Waste.',
  'Step 4: User enters a clear problem description.',
  'Step 5: User chooses Save offline or Submit now.',
  'Step 6: If Save offline is selected, the app stores the complaint locally with a generated clientRequestId and waits for connectivity.',
  'Step 7: If Submit now is selected, the app sends description, category, location, and clientRequestId to the backend.',
  'Step 8: The backend validates the payload and checks whether the same clientRequestId already exists for that citizen.',
  'Step 9: If the request is new, the backend builds the geospatial point, resolves district ownership through ST_Contains, stores the complaint, and sets the initial status to pending.',
  'Step 10: The backend creates a complaint received notification event and queues it for delivery.',
  'Step 11: The app returns to the city map and refreshes complaint data.',
  'Step 12: End.',
].join('\n'), { spacing: { after: 160, line: 320 } }));

parts.push(sectionHeading('4.2.2.2 Detailed Logical Design of Complaint Reporting and District Assignment', 4));
parts.push(figureBlock('complaintFlow'));

parts.push(sectionHeading('4.2.2.3 Field Analysis of Complaint Reporting and District Assignment', 4));
parts.push(table(
  ['Field Name', 'Data Type', 'Size / Rule', 'Required', 'Auto Field', 'Key / Constraint'],
  [
    ['id', 'UUID', 'System generated', 'Yes', 'Yes', 'Primary Key'],
    ['description', 'Varchar', 'Maximum 2000 characters', 'Yes', 'No', 'N/A'],
    ['category', 'Enum', 'waste / water / roads / lighting / drainage / other', 'Yes', 'No', 'Indexed'],
    ['imageUrl', 'Varchar', 'Optional media URL', 'Optional', 'No', 'N/A'],
    ['clientRequestId', 'Varchar', 'Mobile retry identifier, length 120', 'Optional', 'No', 'Indexed with createdById'],
    ['location', 'Geometry Point', 'SRID 4326 longitude and latitude', 'Yes', 'No', 'Geospatial field'],
    ['districtId', 'UUID', 'Resolved district owner', 'Optional', 'No', 'Foreign Key'],
    ['status', 'Enum', 'pending / in_progress / resolved', 'Yes', 'System default', 'Indexed'],
    ['assignedAdminId', 'UUID', 'Assigned district operator', 'Optional', 'No', 'N/A'],
    ['supportCount', 'Integer', 'Default 0', 'Yes', 'System default', 'N/A'],
    ['createdById', 'UUID', 'Citizen account id', 'Yes', 'No', 'Foreign Key'],
    ['metadata', 'JSONB', 'Optional extra values such as request id', 'Optional', 'No', 'N/A'],
  ],
  [1650, 1350, 2400, 900, 1100, 1660],
));

parts.push(sectionHeading('4.2.2.4 Design of Complaint Reporting and District Assignment', 4));
parts.push(figureBlock('complaintUi'));
parts.push(bodyParagraph('The screen favors speed and clarity. Category selection is placed first, followed by a multi-line description field, a location summary card, and two clear actions. The Save offline path protects the reporting workflow when connectivity is unstable, while Submit now sends the complaint immediately. The backend already exposes an upload-session endpoint for signed image upload, so media support can be layered onto this screen without redesigning the module.'));
parts.push(bodyParagraph('Note: the current mobile shell uses fixed demonstration coordinates on the form. The backend, however, already accepts full latitude and longitude input and performs district lookup using the geospatial complaint point.'));

parts.push(sectionHeading('4.2.2.5 UI Analysis of Complaint Reporting and District Assignment', 4));
parts.push(table(
  ['Control Name', 'Control Type', 'Property', 'Value'],
  [
    ['Category selector', 'SegmentedButton', 'Selection values', 'Water, Roads, Lighting, Waste'],
    ['Description box', 'TextField', 'Input purpose', 'Describe the issue'],
    ['Location card', 'Container', 'Content', 'Captured coordinates and upload note'],
    ['Offline action', 'FilledButton.icon', 'Action', 'Save complaint locally'],
    ['Submit action', 'OutlinedButton.icon', 'Action', 'Send complaint to backend'],
    ['Status feedback', 'SnackBar', 'Purpose', 'Success or error message'],
  ],
  [1900, 1700, 1600, 2860],
));

parts.push(pageBreak());
parts.push(sectionHeading('4.2.3 Notification and Update Tracking Module', 3));
parts.push(bodyParagraph('The Notification and Update Tracking module informs citizens when their complaints are received or when complaint status changes. The backend stores each notification as a notification event, creates a queue job for delivery, and then attempts push fan-out to active user devices. On the mobile side, the Updates screen loads notification history and allows the user to refresh the latest service messages.'));

parts.push(sectionHeading('4.2.3.1 Process Analysis of Notification and Update Tracking', 4));
parts.push(paragraph([
  'Step 1: Start.',
  'Step 2: A complaint is created or its status is updated.',
  'Step 3: The backend creates a notification_events record with title, body, type, and complaint reference.',
  'Step 4: The backend inserts a queue job with a dedupe key for notification delivery.',
  'Step 5: The notification worker reserves the next pending delivery job.',
  'Step 6: The worker loads active user devices for the target user.',
  'Step 7: If devices are missing, the event is marked no_devices; if Firebase credentials are configured, the system sends push notifications; otherwise local fallback delivery is recorded for development mode.',
  'Step 8: Delivery status, attempts, timestamps, and error details are saved back to the notification event.',
  'Step 9: The citizen opens the Updates screen and refreshes notification history from the backend.',
  'Step 10: End.',
].join('\n'), { spacing: { after: 160, line: 320 } }));

parts.push(sectionHeading('4.2.3.2 Detailed Logical Design of Notification and Update Tracking', 4));
parts.push(figureBlock('notificationFlow'));

parts.push(sectionHeading('4.2.3.3 Field Analysis of Notification and Update Tracking', 4));
parts.push(table(
  ['Field Name', 'Data Type', 'Size / Rule', 'Required', 'Auto Field', 'Key / Constraint'],
  [
    ['user_devices.id', 'UUID', 'System generated', 'Yes', 'Yes', 'Primary Key'],
    ['user_devices.userId', 'UUID', 'Target user id', 'Yes', 'No', 'Foreign Key'],
    ['user_devices.platform', 'Varchar', 'Platform name', 'Yes', 'No', 'N/A'],
    ['user_devices.appVersion', 'Varchar', 'Application version', 'Yes', 'No', 'N/A'],
    ['user_devices.fcmToken', 'Varchar', 'Push token', 'Yes', 'No', 'Unique with userId'],
    ['notification_events.id', 'UUID', 'System generated', 'Yes', 'Yes', 'Primary Key'],
    ['notification_events.complaintId', 'UUID', 'Related complaint', 'Optional', 'No', 'Foreign Key'],
    ['notification_events.title', 'Varchar', 'Maximum 120 characters', 'Yes', 'No', 'N/A'],
    ['notification_events.body', 'Varchar', 'Maximum 500 characters', 'Yes', 'No', 'N/A'],
    ['notification_events.type', 'Varchar', 'Notification type', 'Yes', 'No', 'N/A'],
    ['notification_events.deliveryStatus', 'Enum', 'pending / delivered / failed / no_devices', 'Yes', 'System default', 'Indexed state'],
    ['notification_events.deliveryAttempts', 'Integer', 'Retry count', 'Yes', 'System default', 'N/A'],
  ],
  [1750, 1300, 2300, 900, 1100, 1710],
));

parts.push(sectionHeading('4.2.3.4 Design of Notification and Update Tracking', 4));
parts.push(figureBlock('notificationUi'));
parts.push(bodyParagraph('The notification design is intentionally simple. Each update is presented as a clean tile with a title, message body, and relative timestamp so the citizen can scan service progress quickly. On backend failure paths, the same notification event data structure also keeps operational metadata such as delivery attempts and the last delivery error, which is useful for system support and auditing.'));
parts.push(bodyParagraph('In the current project, citizen-facing notification history is fully implemented in the mobile shell. Staff-side status changes are currently driven by backend endpoints and can later be surfaced in a dedicated district operations console without changing the notification data model.'));

parts.push(sectionHeading('4.2.3.5 UI Analysis of Notification and Update Tracking', 4));
parts.push(table(
  ['Control Name', 'Control Type', 'Property', 'Value'],
  [
    ['Screen heading', 'Text label', 'Caption', 'Updates'],
    ['Screen subtitle', 'Text label', 'Purpose', 'Status changes and confirmations'],
    ['Notification list', 'ListView', 'Data source', 'Notifications ordered by createdAt desc'],
    ['Notification tile', 'Container', 'Content', 'Title, body, relative time'],
    ['Pull to refresh', 'RefreshIndicator', 'Action', 'Reload notification history'],
    ['Reload button', 'FilledButton', 'Error-state action', 'Reload updates'],
    ['Empty state', 'Text label', 'Display', 'No updates yet.'],
  ],
  [1900, 1600, 1700, 2860],
));

parts.push(pageBreak());
parts.push(sectionHeading('4.3 Entity Relationship Diagram', 2));
parts.push(bodyParagraph('The main data relationships of the MyCity project connect users, complaints, districts, reactions, comments, notification events, device registrations, and queue jobs. The simplified entity relationship view below reflects the structures currently implemented in the backend entities.'));
parts.push(figureBlock('erd'));
parts.push(paragraph('Key relationship summary:', { bold: true, spacing: { after: 120, line: 320 } }));
parts.push(paragraph([
  '1. One user can create many complaints.',
  '2. One district can own many complaints, while one complaint belongs to at most one district.',
  '3. One complaint can have many comments and many reactions.',
  '4. One user can own many device registrations and many notification events.',
  '5. One complaint can trigger many notification events across its lifecycle.',
  '6. Queue jobs store asynchronous work such as notification delivery and reference payload data needed by workers.',
].join('\n'), { spacing: { after: 160, line: 320 } }));

parts.push(sectionHeading('4.4 Interface Snapshots', 2));
parts.push(bodyParagraph('This section presents selected interface snapshots from the implemented MyCity mobile shell. The selected screens reflect the core medium functional scope of the project: user access, complaint submission, and notification follow-up.'));

parts.push(sectionHeading('4.4.1 Authentication Snapshot', 3));
parts.push(figureBlock('authUi'));
parts.push(bodyParagraph('The authentication screen combines registration and login in one simple interface. This supports the first system action of the project by allowing a citizen to create an account or access an existing account before using the complaint features.'));

parts.push(sectionHeading('4.4.2 Complaint Reporting Snapshot', 3));
parts.push(figureBlock('complaintUi'));
parts.push(bodyParagraph('The complaint reporting screen provides category selection, issue description, location context, offline save, and direct submission. This snapshot represents the main citizen workflow of the project and shows the practical service-reporting focus of the system.'));

parts.push(sectionHeading('4.4.3 Notification Snapshot', 3));
parts.push(figureBlock('notificationUi'));
parts.push(bodyParagraph('The updates screen displays complaint confirmations and status changes in a clean chronological layout. This snapshot demonstrates how the system closes the loop after complaint submission by informing the citizen about service progress.'));

parts.push(sectionHeading('4.5 Chapter Summary', 2));
parts.push(bodyParagraph('In summary, Chapter Four has presented the requirements and design of the MyCity project using a realistic medium functional scope. The chapter covered the project roles, user requirements, analysis and design of three core modules, the main entity relationships, and selected interface snapshots. Together, these sections show that the project is focused, meaningful, and consistent with the implemented smart city complaint workflow.'));

const rebuiltDocumentXml = `${documentStart}${parts.join('')}${documentEnd}`;
fs.writeFileSync(documentXmlPath, rebuiltDocumentXml, 'utf8');

if (coreXmlPath && fs.existsSync(coreXmlPath)) {
  const newCoreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MyCity Chapter Four</dc:title>
  <dc:subject>Requirement Analysis and Design</dc:subject>
  <dc:creator>Codex</dc:creator>
  <cp:keywords>MyCity, smart city, chapter four, requirement analysis, design</cp:keywords>
  <dc:description>Chapter Four report for the MyCity smart city complaint platform.</dc:description>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-04-26T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-04-26T00:00:00Z</dcterms:modified>
</cp:coreProperties>
`;
  fs.writeFileSync(coreXmlPath, newCoreXml, 'utf8');
}

console.log(`Updated ${documentXmlPath}`);
