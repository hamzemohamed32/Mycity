import fs from 'node:fs';
import path from 'node:path';

const packageDir = process.argv[2];
const outputPdf = process.argv[3];

if (!packageDir || !outputPdf) {
  console.error('Usage: node scripts/generate_chapter4_pdf_manual.mjs <docx-package-dir> <output-pdf>');
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

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function parsePng(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Unsupported image: ${filePath}`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
    } else if (type === 'IDAT') {
      idat.push(chunk);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || colorType !== 2) {
    throw new Error(`Unsupported PNG mode in ${filePath}. Expected 8-bit RGB.`);
  }
  return { width, height, data: Buffer.concat(idat) };
}

class PdfWriter {
  constructor() {
    this.objects = [null];
    this.pages = [];
    this.fontRefs = {};
    this.imageRefs = {};
    this.imageNames = new Map();
  }

  addObject(value) {
    this.objects.push(value);
    return this.objects.length - 1;
  }

  initFonts() {
    this.fontRefs.Helvetica = this.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    this.fontRefs.HelveticaBold = this.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    this.fontRefs.Courier = this.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  }

  addImage(filePath) {
    if (this.imageRefs[filePath]) return this.imageRefs[filePath];
    const png = parsePng(filePath);
    const objectId = this.addObject({
      dict: `<< /Type /XObject /Subtype /Image /Width ${png.width} /Height ${png.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${png.width} >> /Length ${png.data.length} >>`,
      stream: png.data,
    });
    const name = `Im${Object.keys(this.imageRefs).length + 1}`;
    this.imageRefs[filePath] = { objectId, width: png.width, height: png.height, name };
    this.imageNames.set(name, objectId);
    return this.imageRefs[filePath];
  }

  newPage() {
    const page = { ops: [], images: new Set() };
    this.pages.push(page);
    return page;
  }

  finalize() {
    const pageTreeRef = this.addObject(null);
    const pageRefs = [];
    for (const page of this.pages) {
      const content = Buffer.from(page.ops.join('\n'), 'utf8');
      const contentRef = this.addObject({
        dict: `<< /Length ${content.length} >>`,
        stream: content,
      });
      const xobjects = [...page.images]
        .map((name) => `/${name} ${this.imageNames.get(name)} 0 R`)
        .join(' ');
      const resources = `<< /Font << /F1 ${this.fontRefs.Helvetica} 0 R /F2 ${this.fontRefs.HelveticaBold} 0 R /F3 ${this.fontRefs.Courier} 0 R >> /XObject << ${xobjects} >> >>`;
      const pageRef = this.addObject(`<< /Type /Page /Parent ${pageTreeRef} 0 R /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${contentRef} 0 R >>`);
      pageRefs.push(pageRef);
    }
    this.objects[pageTreeRef] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] >>`;
    const catalogRef = this.addObject(`<< /Type /Catalog /Pages ${pageTreeRef} 0 R >>`);

    const chunks = ['%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'];
    const offsets = [0];
    let current = Buffer.byteLength(chunks[0], 'binary');
    for (let i = 1; i < this.objects.length; i += 1) {
      offsets[i] = current;
      const object = this.objects[i];
      let body;
      if (typeof object === 'string') {
        body = `${i} 0 obj\n${object}\nendobj\n`;
      } else {
        const streamHeader = `${i} 0 obj\n${object.dict}\nstream\n`;
        const streamFooter = `\nendstream\nendobj\n`;
        body = Buffer.concat([
          Buffer.from(streamHeader, 'binary'),
          object.stream,
          Buffer.from(streamFooter, 'binary'),
        ]);
      }
      chunks.push(body);
      current += Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body, 'binary');
    }
    const xrefOffset = current;
    const xref = [`xref\n0 ${this.objects.length}\n`, '0000000000 65535 f \n'];
    for (let i = 1; i < this.objects.length; i += 1) {
      xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }
    const trailer = `trailer\n<< /Size ${this.objects.length} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(xref.join(''));
    chunks.push(trailer);
    return Buffer.concat(chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'binary'))));
  }
}

const paragraphs = [...documentXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
  .map((match) => decodeParagraph(match[0]))
  .filter(Boolean);

const pdf = new PdfWriter();
pdf.initFonts();

let page = pdf.newPage();
let y = 794;
const margin = 48;
const contentWidth = 595 - margin * 2;

function ensureSpace(height) {
  if (y - height < margin) {
    page = pdf.newPage();
    y = 794;
  }
}

function lineHeight(size) {
  return size * 1.35;
}

function estimateWidth(text, size, isMono = false) {
  return text.length * size * (isMono ? 0.6 : 0.52);
}

function wrapText(text, size, width, isMono = false) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateWidth(candidate, size, isMono) <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function drawText(text, x, baselineY, font, size) {
  page.ops.push(`BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${baselineY.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET`);
}

function drawParagraph(text, size = 10.5, font = 'F1', spacing = 6, mono = false) {
  const lines = text.split('\n').flatMap((part) => wrapText(part, size, contentWidth, mono));
  ensureSpace(lines.length * lineHeight(size) + spacing);
  for (const line of lines) {
    drawText(line, margin, y, font, size);
    y -= lineHeight(size);
  }
  y -= spacing;
}

function drawList(items, size = 10.5) {
  for (let i = 0; i < items.length; i += 1) {
    const prefix = `${i + 1}. `;
    const wrapped = wrapText(`${prefix}${items[i]}`, size, contentWidth - 14);
    ensureSpace(wrapped.length * lineHeight(size) + 2);
    for (let lineIndex = 0; lineIndex < wrapped.length; lineIndex += 1) {
      const line = wrapped[lineIndex];
      drawText(line, margin + 12, y, 'F1', size);
      y -= lineHeight(size);
    }
    y -= 2;
  }
  y -= 4;
}

function drawImage(caption, maxWidth, maxHeight) {
  const fileName = figureMap[caption];
  if (!fileName) return;
  const image = pdf.addImage(path.join(figuresDir, fileName));
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ensureSpace(height + 26);
  const x = margin + (contentWidth - width) / 2;
  const imageY = y - height;
  page.images.add(image.name);
  page.ops.push(`q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${imageY.toFixed(2)} cm /${image.name} Do Q`);
  y = imageY - 14;
  drawParagraph(caption, 9.5, 'F1', 2);
}

function drawRule() {
  ensureSpace(12);
  page.ops.push(`0.83 0.89 0.93 RG 1 w ${margin} ${y.toFixed(2)} m ${595 - margin} ${y.toFixed(2)} l S`);
  y -= 12;
}

for (let i = 0; i < paragraphs.length; i += 1) {
  const text = paragraphs[i];

  if (text === 'CHAPTER FOUR') {
    drawParagraph(text, 24, 'F2', 2);
    continue;
  }
  if (text === 'MyCity Smart City Implementation') {
    drawParagraph(text, 12, 'F2', 8);
    continue;
  }
  if (text === 'MyCity Smart City Platform Requirements') {
    drawRule();
    drawParagraph(text, 18, 'F2', 10);
    continue;
  }
  if (text === 'Organizational Chart' || text === 'User Requirements' || text === 'Functional Requirements' || text === 'Non-Functional Requirements') {
    drawParagraph(text, 15, 'F2', 6);
    continue;
  }
  if (/^4\.\d+\.\d+\.\d+/.test(text)) {
    drawParagraph(text, 11.5, 'F2', 4);
    continue;
  }
  if (/^4\.\d+/.test(text)) {
    drawRule();
    drawParagraph(text, 14, 'F2', 6);
    continue;
  }
  if (/^Figure \d+\./.test(text)) {
    const taller = /Detailed logical design|Entity relationship/i.test(text);
    drawImage(text, contentWidth, taller ? 330 : 250);
    continue;
  }
  if (text === 'Field Name' && paragraphs[i + 1] === 'Data Type') {
    i += 6;
    drawParagraph('Field Analysis Table', 10.5, 'F2', 4);
    while (i < paragraphs.length && !/^4\.\d/.test(paragraphs[i]) && !/^Figure \d+\./.test(paragraphs[i])) {
      const row = paragraphs.slice(i, i + 6);
      drawParagraph(row.join(' | '), 8.5, 'F3', 2, true);
      i += 6;
    }
    i -= 1;
    y -= 4;
    continue;
  }
  if (text === 'Control Name' && paragraphs[i + 1] === 'Control Type') {
    i += 4;
    drawParagraph('UI Analysis Table', 10.5, 'F2', 4);
    while (i < paragraphs.length && !/^4\.\d/.test(paragraphs[i]) && !/^Figure \d+\./.test(paragraphs[i])) {
      const row = paragraphs.slice(i, i + 4);
      drawParagraph(row.join(' | '), 8.5, 'F3', 2, true);
      i += 4;
    }
    i -= 1;
    y -= 4;
    continue;
  }
  if (/^[A-C]\. /.test(text)) {
    drawParagraph(text, 11, 'F2', 3);
    continue;
  }
  if (/^(i|ii|iii|iv|v|vi)\./i.test(text)) {
    drawParagraph(text, 10.5, 'F1', 4);
    continue;
  }
  if (/^Step 1:/i.test(text)) {
    const items = text
      .split('\n')
      .map((line) => line.trim().replace(/^Step\s+\d+:\s*/i, ''))
      .filter(Boolean);
    drawList(items, 10.5);
    continue;
  }
  if (/^1\. One user can create many complaints\./.test(text)) {
    const items = text
      .split('\n')
      .map((line) => line.trim().replace(/^\d+\.\s*/, ''))
      .filter(Boolean);
    drawList(items, 10.5);
    continue;
  }
  drawParagraph(text, 10.5, 'F1', 4);
}

fs.writeFileSync(outputPdf, pdf.finalize());
console.log(`Wrote ${outputPdf}`);
