// Render the docs/*.md guides to matching PDFs.
//
// Pure-JS via pdfkit — no headless browser or system tools, works offline once
// dependencies are installed. Handles the Markdown subset used in the docs
// (h1–h3, paragraphs, ordered/unordered lists, code fences, blockquotes, rules,
// and inline **bold** / *italic* / `code`).
//
// Usage: npm run docs:pdf

import { readFileSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Each Markdown guide and the PDF it renders to.
const DOCS = [
  { md: 'docs/TRAINER_GUIDE.md', pdf: 'docs/TRAINER_GUIDE.pdf' },
  { md: 'docs/PROJECT_BACKGROUND.md', pdf: 'docs/PROJECT_BACKGROUND.pdf' },
];

const FONT = 'Helvetica';
const BOLD = 'Helvetica-Bold';
const ITALIC = 'Helvetica-Oblique';
const MONO = 'Courier';

const INK = '#1e293b';
const NAVY = '#0c4a6e';
const BLUE = '#0369a1';
const SLATE = '#334155';
const SKY = '#38bdf8';

// ── Block parser ───────────────────────────────────────────────────────────
function parse(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      flush();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push({ type: 'pre', text: buf.join('\n') });
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      flush();
      blocks.push({ type: 'h', level: line.match(/^#+/)[0].length, text: line.replace(/^#+\s/, '') });
      i++;
      continue;
    }
    if (/^---\s*$/.test(line)) {
      flush();
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: buf.join(' ') });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || (items.length && /^\s{2,}\S/.test(lines[i])))) {
        if (/^\s*[-*]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && (/^\s*\d+\.\s+/.test(lines[i]) || (items.length && /^\s{2,}\S/.test(lines[i])))) {
        if (/^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (line.trim() === '') {
      flush();
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush();
  return blocks;
}

// ── Inline segmentation: **bold**, *italic*, `code` ─────────────────────────
function segments(str) {
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p) => {
    if (p.startsWith('**')) return { text: p.slice(2, -2), font: BOLD, color: '#0f172a' };
    if (p.startsWith('`')) return { text: p.slice(1, -1), font: MONO, color: '#b91c1c' };
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return { text: p.slice(1, -1), font: ITALIC, color: SLATE };
    return { text: p, font: FONT, color: INK };
  });
}

function writeInline(doc, str, opts = {}) {
  const { continued: _ignore, ...rest } = opts; // continuation is decided per-segment
  const segs = segments(str);
  segs.forEach((s, idx) => {
    doc
      .font(s.font)
      .fillColor(s.color)
      .text(s.text, { ...rest, continued: idx < segs.length - 1 });
  });
}

// ── Render ───────────────────────────────────────────────────────────────
function render(mdAbs, pdfAbs) {
const blocks = parse(readFileSync(mdAbs, 'utf8'));
const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 60, right: 60 } });
doc.pipe(createWriteStream(pdfAbs));

const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

for (const b of blocks) {
  if (b.type === 'h') {
    const size = b.level === 1 ? 22 : b.level === 2 ? 15 : 12.5;
    const color = b.level === 1 ? NAVY : b.level === 2 ? BLUE : '#0f172a';
    doc.moveDown(b.level === 1 ? 0.2 : 0.8);
    doc.font(BOLD).fontSize(size).fillColor(color).text(b.text);
    if (b.level === 2) {
      const y = doc.y + 2;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + width, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    }
    doc.moveDown(0.4);
  } else if (b.type === 'p') {
    doc.fontSize(10.5);
    writeInline(doc, b.text, { align: 'left', lineGap: 1.5 });
    doc.moveDown(0.5);
  } else if (b.type === 'ul' || b.type === 'ol') {
    doc.fontSize(10.5);
    const x = doc.page.margins.left + 10;
    b.items.forEach((item, idx) => {
      const marker = b.type === 'ol' ? `${idx + 1}. ` : '•  ';
      doc.font(BOLD).fillColor(BLUE).text(marker, x, doc.y, { continued: true });
      writeInline(doc, item);
      doc.moveDown(0.25);
    });
    doc.moveDown(0.4);
  } else if (b.type === 'pre') {
    const padY = 6;
    const startY = doc.y;
    doc.font(MONO).fontSize(9.5);
    const textHeight = doc.heightOfString(b.text, { width: width - 16 });
    doc.rect(doc.page.margins.left, startY, width, textHeight + padY * 2).fill('#f1f5f9');
    doc.fillColor('#0f172a').text(b.text, doc.page.margins.left + 8, startY + padY, { width: width - 16 });
    doc.moveDown(0.6);
  } else if (b.type === 'quote') {
    doc.fontSize(10.5);
    const startY = doc.y;
    doc.save();
    writeInline(doc, b.text, { width: width - 16, indent: 12, lineGap: 1.5 });
    const endY = doc.y;
    doc.restore();
    doc.moveTo(doc.page.margins.left, startY).lineTo(doc.page.margins.left, endY).strokeColor(SKY).lineWidth(2.5).stroke();
    doc.moveDown(0.6);
  } else if (b.type === 'hr') {
    doc.moveDown(0.3);
    const y = doc.y;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + width, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.moveDown(0.6);
  }
}

doc.end();
console.log('Wrote', pdfAbs);
}

for (const d of DOCS) {
  render(join(root, d.md), join(root, d.pdf));
}
