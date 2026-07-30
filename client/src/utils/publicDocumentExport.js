const DOCUMENT_LABELS = {
    resume: 'Resume',
    cover: 'Cover Letter',
    description: 'Job Description'
};

const STANDARD_HEADINGS = new Set([
    'professional summary',
    'career summary',
    'summary',
    'profile',
    'objective',
    'core skills',
    'key skills',
    'technical skills',
    'skills',
    'professional experience',
    'work experience',
    'experience',
    'employment history',
    'education',
    'qualifications',
    'certifications',
    'projects',
    'projects & achievements',
    'achievements',
    'languages',
    'additional information',
    'about the opportunity',
    'about the role',
    'role overview',
    'job overview',
    'what you will do',
    'key responsibilities',
    'responsibilities',
    'what you will bring',
    'essential requirements',
    'requirements',
    'preferred qualifications',
    'what we offer',
    'benefits',
    'salary and benefits',
    'location and working pattern',
    'how to apply'
]);

const normalizeDocumentText = (value = '') => String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/â€¢|●|▪/g, '•')
    .replace(/â€”|â€“/g, '—')
    .replace(/â€™/g, '’')
    .replace(/\u00a0/g, ' ')
    .trim();

const cleanLine = (value = '') => String(value || '')
    .replace(/^\s{0,3}#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .trim();

const normalizeHeading = (value = '') => cleanLine(value)
    .replace(/:$/, '')
    .toLowerCase();

const isHeading = (line = '') => {
    const clean = cleanLine(line);
    const normalized = normalizeHeading(clean);
    if (!clean || clean.length > 72 || /@|https?:\/\//i.test(clean)) {
        return false;
    }
    if (STANDARD_HEADINGS.has(normalized)) {
        return true;
    }
    return /^[A-Z][A-Z0-9 &/+-]{2,}$/.test(clean) && clean.split(/\s+/).length <= 7;
};

const looksLikeContact = (line = '') => (
    /@|\+?\d[\d\s().-]{6,}|\bl(?:inked)?in\b|\bportfolio\b|\bgithub\b|\s[|·]\s/i.test(line)
);

const isBullet = (line = '') => /^\s*[-*•]\s+/.test(line);

const flushParagraph = (buffer, blocks) => {
    const text = buffer.splice(0).join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
        blocks.push({ type: 'paragraph', text });
    }
};

export const buildPublicDocumentModel = (text, mode = 'resume') => {
    const normalizedMode = DOCUMENT_LABELS[mode] ? mode : 'resume';
    const normalizedText = normalizeDocumentText(text);
    const sourceLines = normalizedText.split('\n');
    const firstContentIndex = sourceLines.findIndex((line) => cleanLine(line));
    const blocks = [];
    const paragraphBuffer = [];
    let title = '';
    let contact = '';
    let startIndex = Math.max(0, firstContentIndex);

    if (normalizedMode === 'resume') {
        const firstLine = cleanLine(sourceLines[startIndex] || '');
        const firstIsDocumentLabel = /^(resume|curriculum vitae|cv)$/i.test(firstLine);
        if (firstIsDocumentLabel) {
            startIndex += 1;
        }
        title = cleanLine(sourceLines[startIndex] || '') || 'Your Name';
        startIndex += 1;

        while (startIndex < sourceLines.length && !cleanLine(sourceLines[startIndex])) {
            startIndex += 1;
        }
        if (looksLikeContact(sourceLines[startIndex] || '')) {
            contact = cleanLine(sourceLines[startIndex]);
            startIndex += 1;
        }
    } else if (normalizedMode === 'description') {
        title = cleanLine(sourceLines[startIndex] || '') || 'Role Title';
        startIndex += 1;
    }

    for (let index = startIndex; index < sourceLines.length; index += 1) {
        const rawLine = sourceLines[index];
        const line = cleanLine(rawLine);

        if (!line) {
            flushParagraph(paragraphBuffer, blocks);
            continue;
        }

        if (isHeading(line)) {
            flushParagraph(paragraphBuffer, blocks);
            blocks.push({ type: 'heading', text: line.replace(/:$/, '') });
            continue;
        }

        if (isBullet(rawLine)) {
            flushParagraph(paragraphBuffer, blocks);
            blocks.push({
                type: 'bullet',
                text: cleanLine(rawLine.replace(/^\s*[-*•]\s+/, ''))
            });
            continue;
        }

        if (
            normalizedMode === 'cover'
            && /^(dear\b|kind regards|sincerely|yours sincerely|yours faithfully|best regards)/i.test(line)
        ) {
            flushParagraph(paragraphBuffer, blocks);
            blocks.push({ type: 'paragraph', text: line, emphasis: true });
            continue;
        }

        paragraphBuffer.push(line);
    }
    flushParagraph(paragraphBuffer, blocks);

    const lowerText = normalizedText.toLowerCase();
    const atsSections = ['summary', 'experience', 'education', 'skills']
        .filter((section) => lowerText.includes(section));

    return {
        mode: normalizedMode,
        label: DOCUMENT_LABELS[normalizedMode],
        title,
        contact,
        blocks,
        plainText: normalizedText,
        atsReady: normalizedMode === 'resume' && atsSections.length === 4,
        atsSectionCount: atsSections.length
    };
};

const safeFilename = (value = '') => String(value || '')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'jumptake-document';

const getDocumentFilename = (model, extension) => {
    const subject = model.mode === 'resume'
        ? model.title
        : model.mode === 'description'
            ? model.title
            : 'cover-letter';
    return `${safeFilename(`jumptake-${subject || model.label}`)}.${extension}`;
};

const downloadBlob = (blob, filename) => {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
};

const xmlEscape = (value = '') => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wordParagraph = (text, style = 'Normal', { bold = false } = {}) => {
    const runProperties = bold ? '<w:rPr><w:b/></w:rPr>' : '';
    return `
        <w:p>
            <w:pPr><w:pStyle w:val="${style}"/></w:pPr>
            <w:r>${runProperties}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>
        </w:p>
    `;
};

const buildWordDocumentXml = (model) => {
    const paragraphs = [];
    if (model.title) {
        paragraphs.push(wordParagraph(model.title, 'Title'));
    }
    if (model.contact) {
        paragraphs.push(wordParagraph(model.contact, 'Subtitle'));
    }

    model.blocks.forEach((block) => {
        if (block.type === 'heading') {
            paragraphs.push(wordParagraph(block.text.toUpperCase(), 'Heading1'));
        } else if (block.type === 'bullet') {
            paragraphs.push(wordParagraph(`• ${block.text}`, 'ListParagraph'));
        } else {
            paragraphs.push(wordParagraph(block.text, 'Normal', { bold: block.emphasis }));
        }
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
                ${paragraphs.join('')}
                <w:sectPr>
                    <w:pgSz w:w="11906" w:h="16838"/>
                    <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
                </w:sectPr>
            </w:body>
        </w:document>`;
};

const WORD_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
        <w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/></w:rPr></w:rPrDefault>
        <w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
    </w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:basedOn w:val="Normal"/>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
        <w:rPr><w:b/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Subtitle">
        <w:name w:val="Subtitle"/>
        <w:basedOn w:val="Normal"/>
        <w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/></w:pPr>
        <w:rPr><w:color w:val="374151"/><w:sz w:val="19"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="Heading 1"/>
        <w:basedOn w:val="Normal"/>
        <w:pPr><w:keepNext/><w:spacing w:before="180" w:after="70"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="3" w:color="111827"/></w:pBdr></w:pPr>
        <w:rPr><w:b/><w:caps/><w:sz w:val="21"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="ListParagraph">
        <w:name w:val="List Paragraph"/>
        <w:basedOn w:val="Normal"/>
        <w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:after="60"/></w:pPr>
    </w:style>
</w:styles>`;

export const downloadPublicDocumentDocx = async (model) => {
    const jsZipModule = await import('jszip');
    const JSZip = jsZipModule.default || jsZipModule;
    const zip = new JSZip();

    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
            <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
        </Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`);
    zip.folder('word').file('document.xml', buildWordDocumentXml(model));
    zip.folder('word').file('styles.xml', WORD_STYLES_XML);
    zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
        </Relationships>`);

    const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
    });
    downloadBlob(blob, getDocumentFilename(model, 'docx'));
};

const toPdfAscii = (value = '') => String(value || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/[^\x20-\x7E]/g, '');

const pdfEscape = (value = '') => toPdfAscii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const wrapPdfText = (text, maximumCharacters) => {
    const words = toPdfAscii(text).trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
        return [''];
    }
    const lines = [];
    let current = '';
    words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maximumCharacters && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    });
    if (current) {
        lines.push(current);
    }
    return lines;
};

const getPdfRows = (model) => {
    const rows = [];
    if (model.title) {
        rows.push({ text: model.title, font: 'F2', size: 18, align: 'center', before: 0, after: 5 });
    }
    if (model.contact) {
        rows.push({ text: model.contact, font: 'F1', size: 9, align: 'center', before: 0, after: 11 });
    }
    model.blocks.forEach((block) => {
        if (block.type === 'heading') {
            rows.push({ text: block.text.toUpperCase(), font: 'F2', size: 11, before: 9, after: 4 });
        } else if (block.type === 'bullet') {
            rows.push({ text: `- ${block.text}`, font: 'F1', size: 10, indent: 14, before: 0, after: 3 });
        } else {
            rows.push({ text: block.text, font: block.emphasis ? 'F2' : 'F1', size: 10, before: 2, after: 5 });
        }
    });
    return rows;
};

const buildPdf = (model) => {
    const pageWidth = 595;
    const pageHeight = 842;
    const marginX = 52;
    const topY = 790;
    const bottomY = 52;
    const contentWidth = pageWidth - (marginX * 2);
    const pages = [];
    let commands = [];
    let y = topY;

    const startNewPage = () => {
        if (commands.length) {
            pages.push(commands.join('\n'));
        }
        commands = [];
        y = topY;
    };

    getPdfRows(model).forEach((row) => {
        const lineHeight = row.size * 1.36;
        const characterWidth = row.size * 0.52;
        const maxCharacters = Math.max(24, Math.floor((contentWidth - (row.indent || 0)) / characterWidth));
        const lines = wrapPdfText(row.text, maxCharacters);
        const requiredHeight = (row.before || 0) + (lines.length * lineHeight) + (row.after || 0);
        if (y - requiredHeight < bottomY) {
            startNewPage();
        }
        y -= row.before || 0;
        lines.forEach((line) => {
            let x = marginX + (row.indent || 0);
            if (row.align === 'center') {
                x = Math.max(marginX, (pageWidth - (line.length * characterWidth)) / 2);
            }
            commands.push(`BT /${row.font} ${row.size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(line)}) Tj ET`);
            y -= lineHeight;
        });
        y -= row.after || 0;
    });
    if (commands.length || !pages.length) {
        pages.push(commands.join('\n'));
    }

    const pageObjectNumbers = pages.map((_, index) => 5 + (index * 2));
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
    ];

    pages.forEach((stream, index) => {
        const contentObjectNumber = 6 + (index * 2);
        objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
        objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
};

export const downloadPublicDocumentPdf = (model) => {
    const blob = new Blob([buildPdf(model)], { type: 'application/pdf' });
    downloadBlob(blob, getDocumentFilename(model, 'pdf'));
};

export const downloadPublicDocumentTxt = (model) => {
    const blob = new Blob([model.plainText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, getDocumentFilename(model, 'txt'));
};
