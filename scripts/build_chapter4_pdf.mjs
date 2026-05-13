import fs from 'node:fs';
import path from 'node:path';

const packageDir = process.argv[2];
const outputHtml = process.argv[3];

if (!packageDir || !outputHtml) {
  console.error('Usage: node scripts/build_chapter4_pdf.mjs <docx-package-dir> <output-html>');
  process.exit(1);
}

const repoRoot = process.cwd();
const figuresDir = path.join(repoRoot, 'output', 'figures', 'chapter4');
const documentXml = fs.readFileSync(path.join(packageDir, 'word', 'document.xml'), 'utf8');

const figureMap = {
  'Figure 1. MyCity organizational chart': 'Figure_4_1_1_Organizational_Chart_Revised.png',
  'Figure 2. Detailed logical design of user registration and login': 'Figure_4_2_1_2_User_Registration_Login_Logical_Design_Revised_v2.png',
  'Figure 3. Design of user registration and login': 'Figure_4_2_1_4_User_Registration_Login_Design.png',
  'Figure 4. Detailed logical design of complaint reporting and district assignment': 'Figure_4_2_2_2_Complaint_Reporting_Logical_Design_Revised.png',
  'Figure 5. Design of complaint reporting and district assignment': 'Figure_4_2_2_4_Complaint_Reporting_Design.png',
  'Figure 6. Detailed logical design of notification and update tracking': 'Figure_4_2_3_2_Notification_Update_Logical_Design_Revised.png',
  'Figure 7. Design of notification and update tracking': 'Figure_4_2_3_4_Notification_Update_Design.png',
  'Figure 8. Entity relationship diagram for MyCity': 'Figure_4_3_Entity_Relationship_Diagram_Revised_v2.png',
  'Figure 9. Authentication interface snapshot': 'Figure_4_4_1_Authentication_Snapshot.png',
  'Figure 10. Complaint reporting interface snapshot': 'Figure_4_4_2_Complaint_Reporting_Snapshot.png',
  'Figure 11. Notification interface snapshot': 'Figure_4_4_3_Notification_Snapshot.png',
};

function decodeParagraph(xml) {
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toFileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, '/').replace(/ /g, '%20')}`;
}

const paragraphs = [...documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
  .map((match) => decodeParagraph(match[0]))
  .filter(Boolean);

const html = [];

function add(text) {
  html.push(text);
}

function isMajorHeading(text) {
  return (
    text === 'CHAPTER FOUR' ||
    text === 'MyCity Smart City Implementation' ||
    text === 'MyCity Smart City Platform Requirements' ||
    text === 'Organizational Chart' ||
    text === 'User Requirements' ||
    text === 'Functional Requirements' ||
    text === 'Non-Functional Requirements' ||
    /^4\.\d/.test(text)
  );
}

function renderStepBlock(text) {
  const items = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  add('<ol class="steps">');
  for (const item of items) {
    const clean = item.replace(/^Step\s+\d+:\s*/i, '');
    add(`<li>${escapeHtml(clean)}</li>`);
  }
  add('</ol>');
}

function renderFieldTable(rows) {
  add('<table class="data-table">');
  add('<thead><tr><th>Field Name</th><th>Data Type</th><th>Size / Rule</th><th>Required</th><th>Auto Field</th><th>Key / Constraint</th></tr></thead>');
  add('<tbody>');
  for (let i = 0; i < rows.length; i += 6) {
    add('<tr>');
    for (let j = 0; j < 6; j += 1) {
      add(`<td>${escapeHtml(rows[i + j] ?? '')}</td>`);
    }
    add('</tr>');
  }
  add('</tbody></table>');
}

function renderUiTable(rows) {
  add('<table class="data-table">');
  add('<thead><tr><th>Control Name</th><th>Control Type</th><th>Property</th><th>Value</th></tr></thead>');
  add('<tbody>');
  for (let i = 0; i < rows.length; i += 4) {
    add('<tr>');
    for (let j = 0; j < 4; j += 1) {
      add(`<td>${escapeHtml(rows[i + j] ?? '')}</td>`);
    }
    add('</tr>');
  }
  add('</tbody></table>');
}

add(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>MyCity Chapter Four</title>
  <style>
    :root {
      --ink: #163041;
      --muted: #526878;
      --line: #d7e1e8;
      --panel: #ffffff;
      --soft: #f4f8fb;
      --accent: #2d87c8;
      --accent-soft: #dceefd;
      --page: #eef4f7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--ink);
      background: var(--page);
      line-height: 1.45;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 16mm 18mm;
      background: var(--panel);
    }
    h1, h2, h3, h4 { margin: 0 0 10px; line-height: 1.2; }
    h1 { font-size: 30px; letter-spacing: 0; color: #0f2737; }
    h2 { font-size: 22px; margin-top: 24px; padding-bottom: 6px; border-bottom: 2px solid var(--accent-soft); }
    h3 { font-size: 18px; margin-top: 18px; }
    h4 { font-size: 15px; margin-top: 14px; color: #23485f; }
    p { margin: 8px 0 10px; font-size: 13.5px; }
    .lead {
      background: linear-gradient(135deg, #eef7ff 0%, #f7fbff 100%);
      border: 1px solid #d8ebfb;
      border-radius: 12px;
      padding: 14px 16px;
      margin: 14px 0 18px;
    }
    .section-label {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: #15527e;
      font-size: 12px;
      font-weight: 700;
      margin: 18px 0 6px;
    }
    .subrole { font-weight: 700; margin-top: 12px; }
    .figure {
      margin: 16px 0 18px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fbfdff;
      page-break-inside: avoid;
    }
    .figure img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 8px;
      border: 1px solid #e3eaef;
    }
    .caption {
      margin-top: 10px;
      font-size: 12.5px;
      color: var(--muted);
      text-align: center;
      font-style: italic;
    }
    .steps {
      margin: 8px 0 12px 20px;
      padding: 0;
      font-size: 13.5px;
    }
    .steps li { margin: 4px 0; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 18px;
      font-size: 12px;
      page-break-inside: avoid;
    }
    .data-table th,
    .data-table td {
      border: 1px solid var(--line);
      padding: 7px 8px;
      vertical-align: top;
      text-align: left;
    }
    .data-table th {
      background: #edf5fb;
      color: #19425d;
      font-weight: 700;
    }
    .inline-title {
      font-weight: 700;
      color: #17394f;
    }
    .summary {
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
    }
    @page {
      size: A4;
      margin: 12mm;
    }
  </style>
</head>
<body>
  <main class="page">`);

for (let i = 0; i < paragraphs.length; i += 1) {
  const text = paragraphs[i];

  if (text === 'CHAPTER FOUR') {
    add(`<h1>${escapeHtml(text)}</h1>`);
    continue;
  }
  if (text === 'MyCity Smart City Implementation') {
    add(`<p class="section-label">${escapeHtml(text)}</p>`);
    continue;
  }
  if (text === 'MyCity Smart City Platform Requirements') {
    add(`<h2>${escapeHtml(text)}</h2>`);
    continue;
  }
  if (/^Figure \d+\./.test(text)) {
    const fileName = figureMap[text];
    if (fileName) {
      const filePath = path.join(figuresDir, fileName);
      add('<figure class="figure">');
      add(`<img src="${toFileUrl(filePath)}" alt="${escapeHtml(text)}" />`);
      add(`<figcaption class="caption">${escapeHtml(text)}</figcaption>`);
      add('</figure>');
      continue;
    }
  }
  if (text === 'Field Name' && paragraphs[i + 1] === 'Data Type') {
    const rows = [];
    i += 6;
    while (i + 1 < paragraphs.length && !isMajorHeading(paragraphs[i]) && !/^Figure \d+\./.test(paragraphs[i])) {
      rows.push(paragraphs[i]);
      i += 1;
    }
    i -= 1;
    renderFieldTable(rows);
    continue;
  }
  if (text === 'Control Name' && paragraphs[i + 1] === 'Control Type') {
    const rows = [];
    i += 4;
    while (i + 1 < paragraphs.length && !isMajorHeading(paragraphs[i]) && !/^Figure \d+\./.test(paragraphs[i])) {
      rows.push(paragraphs[i]);
      i += 1;
    }
    i -= 1;
    renderUiTable(rows);
    continue;
  }
  if (text === 'Organizational Chart' || text === 'User Requirements' || text === 'Functional Requirements' || text === 'Non-Functional Requirements' || /^4\.\d(?:\.\d(?:\.\d)?)?/.test(text)) {
    const tag = /^4\.\d+\.\d+\.\d+/.test(text) ? 'h4' : /^4\.\d+/.test(text) ? 'h3' : 'h2';
    add(`<${tag}>${escapeHtml(text)}</${tag}>`);
    continue;
  }
  if (/^[A-C]\. /.test(text)) {
    add(`<p class="subrole">${escapeHtml(text)}</p>`);
    continue;
  }
  if (/^(i|ii|iii|iv|v|vi)\./i.test(text)) {
    const splitIndex = text.indexOf(':');
    if (splitIndex > -1) {
      add(`<p><span class="inline-title">${escapeHtml(text.slice(0, splitIndex + 1))}</span> ${escapeHtml(text.slice(splitIndex + 1).trim())}</p>`);
    } else {
      add(`<p>${escapeHtml(text)}</p>`);
    }
    continue;
  }
  if (/^Step 1:/i.test(text)) {
    renderStepBlock(text);
    continue;
  }
  if (text === 'Key relationship summary:') {
    add(`<p class="subrole">${escapeHtml(text)}</p>`);
    continue;
  }
  if (/^1\. One user can create many complaints\./.test(text)) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    add('<ol class="steps">');
    for (const line of lines) {
      add(`<li>${escapeHtml(line.replace(/^\d+\.\s*/, ''))}</li>`);
    }
    add('</ol>');
    continue;
  }
  if (text === paragraphs[3]) {
    add(`<p class="lead">${escapeHtml(text)}</p>`);
    continue;
  }
  if (text === paragraphs[391]) {
    add(`<p class="summary">${escapeHtml(text)}</p>`);
    continue;
  }
  add(`<p>${escapeHtml(text)}</p>`);
}

add(`  </main>
</body>
</html>`);

fs.writeFileSync(outputHtml, html.join('\n'));
console.log(`Wrote ${outputHtml}`);
