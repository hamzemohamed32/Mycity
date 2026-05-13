import fs from 'node:fs';
import path from 'node:path';

const packageDir = process.argv[2];
if (!packageDir) {
  console.error('Usage: node scripts/finalize_chapter4_doc_safe.mjs <extracted-docx-package-dir>');
  process.exit(1);
}

const repoRoot = process.cwd();
const figuresDir = path.join(repoRoot, 'output', 'figures', 'chapter4');
const mediaDir = path.join(packageDir, 'word', 'media');
const documentPath = path.join(packageDir, 'word', 'document.xml');
const relsPath = path.join(packageDir, 'word', '_rels', 'document.xml.rels');

const mediaMap = {
  'mycity_org_chart.png': 'Figure_4_1_1_Organizational_Chart_Revised.png',
  'mycity_auth_flow.png': 'Figure_4_2_1_2_User_Registration_Login_Logical_Design_Revised_v2.png',
  'mycity_auth_ui.png': 'Figure_4_4_1_Authentication_Snapshot.png',
  'mycity_complaint_flow.png': 'Figure_4_2_2_2_Complaint_Reporting_Logical_Design_Revised.png',
  'mycity_complaint_ui.png': 'Figure_4_4_2_Complaint_Reporting_Snapshot.png',
  'mycity_notification_flow.png': 'Figure_4_2_3_2_Notification_Update_Logical_Design_Revised.png',
  'mycity_notification_ui.png': 'Figure_4_4_3_Notification_Snapshot.png',
  'mycity_erd.png': 'Figure_4_3_Entity_Relationship_Diagram_Revised_v2.png',
};

const displayWidthPx = {
  'mycity_org_chart.png': 650,
  'mycity_auth_flow.png': 650,
  'mycity_auth_ui.png': 560,
  'mycity_complaint_flow.png': 650,
  'mycity_complaint_ui.png': 560,
  'mycity_notification_flow.png': 650,
  'mycity_notification_ui.png': 560,
  'mycity_erd.png': 650,
};

const svgToPngRel = {
  'mycity_org_chart.png': ['rId33', 'rId17'],
  'mycity_auth_flow.png': ['rId34', 'rId18'],
  'mycity_auth_ui.png': ['rId35', 'rId19'],
  'mycity_complaint_flow.png': ['rId36', 'rId20'],
  'mycity_complaint_ui.png': ['rId37', 'rId21'],
  'mycity_notification_flow.png': ['rId38', 'rId22'],
  'mycity_notification_ui.png': ['rId39', 'rId23'],
  'mycity_erd.png': ['rId40', 'rId24'],
};

const EMU_PER_PX = 9525;

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${filePath} is not a PNG file`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function replaceAllChecked(input, from, to, label) {
  if (!input.includes(from)) throw new Error(`Missing expected text: ${label}`);
  return input.split(from).join(to);
}

function replaceNth(input, from, to, occurrence, label) {
  let index = -1;
  let offset = 0;
  for (let i = 0; i < occurrence; i += 1) {
    index = input.indexOf(from, offset);
    if (index === -1) throw new Error(`Missing expected occurrence ${occurrence}: ${label}`);
    offset = index + from.length;
  }
  return input.slice(0, index) + to + input.slice(index + from.length);
}

for (const [targetName, sourceName] of Object.entries(mediaMap)) {
  const source = path.join(figuresDir, sourceName);
  const target = path.join(mediaDir, targetName);
  if (!fs.existsSync(source)) throw new Error(`Missing final diagram: ${source}`);
  fs.copyFileSync(source, target);
}

let relsXml = fs.readFileSync(relsPath, 'utf8');
for (const targetName of Object.keys(mediaMap)) {
  if (!relsXml.includes(`Target="media/${targetName}"`)) {
    throw new Error(`Original PNG relationship missing for ${targetName}`);
  }
}
relsXml = relsXml.replace(/<Relationship\b[^>]*Target="media\/mycity_[^"]+\.svg"[^>]*\/>/g, '');
fs.writeFileSync(relsPath, relsXml);

for (const file of fs.readdirSync(mediaDir)) {
  if (/^mycity_.*\.svg$/i.test(file)) {
    fs.rmSync(path.join(mediaDir, file));
  }
}

let documentXml = fs.readFileSync(documentPath, 'utf8');

for (const [targetName, [oldRelId, newRelId]] of Object.entries(svgToPngRel)) {
  documentXml = documentXml.split(`r:embed="${oldRelId}"`).join(`r:embed="${newRelId}"`);
  documentXml = documentXml.split(targetName.replace(/\.png$/i, '.svg')).join(targetName);
}

documentXml = replaceAllChecked(
  documentXml,
  'The organization chart now shows only the roles that exist in the project code. The System Administrator manages platform configuration, security, and access control. The City Administrator oversees cross-district complaint performance. District Administrators review and manage complaints assigned to their districts. Citizens are the reporting users who create accounts, submit complaints, track progress, and receive updates.',
  'The organizational chart shows the main actors in the MyCity Smart City project. The Mayor represents city leadership and service direction. The City Administrator supervises city service operations and coordinates complaint performance across districts. District Administrators handle complaints assigned to their districts and update complaint progress. The System Administrator maintains platform access, security, roles, and technical reliability. Citizen Users use the system to register, report city issues, and track service updates.',
  'organization chart description',
);

documentXml = replaceAllChecked(
  documentXml,
  'The main data relationships of the MyCity project connect users, complaints, districts, reactions, comments, notification events, device registrations, and queue jobs. The simplified entity relationship view below reflects the structures currently implemented in the backend entities.',
  'The main data relationships of the MyCity project connect users, complaints, districts, device registrations, notification events, and queue jobs. The simplified database-style entity relationship view below reflects the core tables used by the medium-scope project.',
  'ERD introduction',
);

documentXml = replaceAllChecked(documentXml, '2. One district can own many complaints, while one complaint belongs to at most one district.', '2. One district can own many complaints, while one complaint belongs to one district.', 'ERD relationship 2');
documentXml = replaceAllChecked(documentXml, '3. One complaint can have many comments and many reactions.', '3. One user can own many registered devices.', 'ERD relationship 3');
documentXml = replaceAllChecked(documentXml, '4. One user can own many device registrations and many notification events.', '4. One user can receive many notification events.', 'ERD relationship 4');
documentXml = replaceAllChecked(documentXml, '6. Queue jobs store asynchronous work such as notification delivery and reference payload data needed by workers.', '6. Notification events can create queue jobs for asynchronous delivery.', 'ERD relationship 6');

documentXml = replaceNth(documentXml, 'Figure 3. Design of user registration and login', 'Figure 9. Authentication interface snapshot', 2, 'authentication snapshot caption');
documentXml = replaceNth(documentXml, 'Figure 5. Design of complaint reporting and district assignment', 'Figure 10. Complaint reporting interface snapshot', 2, 'complaint snapshot caption');
documentXml = replaceNth(documentXml, 'Figure 7. Design of notification and update tracking', 'Figure 11. Notification interface snapshot', 2, 'notification snapshot caption');

for (const targetName of Object.keys(mediaMap)) {
  const [, relId] = svgToPngRel[targetName];
  const size = pngSize(path.join(mediaDir, targetName));
  const widthPx = displayWidthPx[targetName];
  const heightPx = Math.round((widthPx * size.height) / size.width);
  const cx = Math.round(widthPx * EMU_PER_PX);
  const cy = Math.round(heightPx * EMU_PER_PX);
  let replaced = 0;
  documentXml = documentXml.replace(/<wp:inline[\s\S]*?<\/wp:inline>/g, (block) => {
    if (!block.includes(`r:embed="${relId}"`)) return block;
    replaced += 1;
    return block
      .replace(/<wp:extent cx="\d+" cy="\d+"\/>/g, `<wp:extent cx="${cx}" cy="${cy}"/>`)
      .replace(/<a:ext cx="\d+" cy="\d+"\/>/g, `<a:ext cx="${cx}" cy="${cy}"/>`);
  });
  if (replaced === 0) throw new Error(`No drawing block found for ${targetName}`);
}

fs.writeFileSync(documentPath, documentXml);
console.log('Safe DOCX finalization complete.');
