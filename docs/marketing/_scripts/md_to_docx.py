"""
Convert Arabic markdown to printable Word document.
Uses python-docx, applies RTL direction, Arabic font (Tahoma for body, larger sizes for headings).
"""
import re
import sys
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ---------- Helpers ----------

def set_rtl(paragraph):
    """Set paragraph direction to RTL (right-to-left) for Arabic."""
    pPr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)

def set_rtl_for_doc(doc):
    """Set default document direction to RTL."""
    styles = doc.styles.element
    rPr_default = styles.find(qn('w:docDefaults'))
    if rPr_default is None:
        return
    bidi_default = OxmlElement('w:bidi')
    bidi_default.set(qn('w:val'), '1')
    rPr = rPr_default.find(qn('w:rPr'))
    if rPr is None:
        rPr = OxmlElement('w:rPr')
        rPr_default.append(rPr)
    rPr.append(bidi_default)

def set_arabic_font(run, size=None, bold=False, color=None):
    """Apply Arabic-friendly font (Tahoma) to a run."""
    run.font.name = 'Tahoma'
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), 'Tahoma')
    rFonts.set(qn('w:hAnsi'), 'Tahoma')
    rFonts.set(qn('w:cs'), 'Tahoma')
    rFonts.set(qn('w:eastAsia'), 'Tahoma')
    if size is not None:
        run.font.size = Pt(size)
    if bold:
        run.font.bold = True
    if color:
        run.font.color.rgb = color

def add_paragraph_styled(doc, text, size=11, bold=False, color=None, alignment=None, space_after=4):
    """Add a paragraph with Arabic styling."""
    p = doc.add_paragraph()
    set_rtl(p)
    if alignment is not None:
        p.alignment = alignment
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(text)
    set_arabic_font(run, size=size, bold=bold, color=color)
    return p

def add_heading(doc, text, level=1):
    """Add an Arabic heading with proper styling."""
    sizes = {1: 22, 2: 16, 3: 13, 4: 12, 5: 11, 6: 11}
    colors = {
        1: RGBColor(0x1F, 0x4E, 0x79),  # deep blue
        2: RGBColor(0x2E, 0x75, 0xB6),
        3: RGBColor(0x5B, 0x9B, 0xD5),
        4: RGBColor(0x40, 0x40, 0x40),
    }
    size = sizes.get(level, 11)
    color = colors.get(level, RGBColor(0x40, 0x40, 0x40))
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_before = Pt(14 if level <= 2 else 8)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_arabic_font(run, size=size, bold=True, color=color)
    return p

def add_bullet(doc, text, level=0):
    """Add a bullet list item."""
    p = doc.add_paragraph(style='List Bullet')
    set_rtl(p)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    indent = "    " * level
    full_text = indent + ("• " if level == 0 else "◦ ") + text
    run = p.add_run(full_text)
    set_arabic_font(run, size=11)
    return p

def add_numbered(doc, text, number):
    """Add a numbered list item."""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(f"{number}. {text}")
    set_arabic_font(run, size=11)
    return p

def add_code_block(doc, code_text):
    """Add a code block with monospace font and shading."""
    p = doc.add_paragraph()
    set_rtl(p)
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.right_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.space_before = Pt(2)
    # Add light gray shading
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F2F2F2')
    pPr.append(shd)
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    rPr = run._element.get_or_add_rPr()
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), 'Consolas')
    rFonts.set(qn('w:hAnsi'), 'Consolas')
    rFonts.set(qn('w:cs'), 'Consolas')
    rPr.append(rFonts)
    run.font.size = Pt(9.5)
    return p

def add_table(doc, header_row, data_rows):
    """Add a formatted table with RTL."""
    if not data_rows:
        return
    table = doc.add_table(rows=1 + len(data_rows), cols=len(header_row))
    table.style = 'Light Grid Accent 1'
    table.autofit = True
    # Set RTL for table
    tbl = table._tbl
    tblPr = tbl.find(qn('w:tblPr'))
    if tblPr is None:
        tblPr = OxmlElement('w:tblPr')
        tbl.insert(0, tblPr)
    bidi = OxmlElement('w:bidiVisual')
    tblPr.append(bidi)
    # Header
    for i, cell_text in enumerate(header_row):
        cell = table.rows[0].cells[i]
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        set_rtl(p)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(str(cell_text))
        set_arabic_font(run, size=10, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
        # Background color for header
        tcPr = cell._tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '1F4E79')
        tcPr.append(shd)
    # Data rows
    for row_idx, row_data in enumerate(data_rows):
        row = table.rows[row_idx + 1]
        for i, cell_text in enumerate(row_data):
            cell = row.cells[i]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            set_rtl(p)
            run = p.add_run(str(cell_text))
            set_arabic_font(run, size=9.5)
            # Alternating row color
            if row_idx % 2 == 1:
                tcPr = cell._tc.get_or_add_tcPr()
                shd = OxmlElement('w:shd')
                shd.set(qn('w:val'), 'clear')
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:fill'), 'F8F9FA')
                tcPr.append(shd)
    # Add spacing after table
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table

def add_horizontal_rule(doc):
    """Add a horizontal rule."""
    p = doc.add_paragraph()
    set_rtl(p)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), 'CCCCCC')
    pBdr.append(bottom)
    pPr.append(pBdr)

def add_page_break(doc):
    doc.add_page_break()

# ---------- Markdown Parser ----------

def parse_inline(text):
    """Parse inline markdown (bold, italic, code) and return plain text (we don't preserve formatting in body to keep Arabic clean)."""
    # Remove bold markers but keep text
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    # Remove italic markers
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    # Remove inline code markers
    text = re.sub(r'`(.+?)`', r'\1', text)
    # Remove links but keep text
    text = re.sub(r'\[(.+?)\]\((.+?)\)', r'\1', text)
    return text

def parse_table_row(line):
    """Parse a markdown table row into cells."""
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    return [parse_inline(c) for c in cells]

def is_separator_row(line):
    return bool(re.match(r'^\|?[\s\-:|]+\|?$', line.strip()))

def convert_markdown_to_docx(md_path, docx_path):
    """Main conversion function."""
    md_content = Path(md_path).read_text(encoding='utf-8')
    lines = md_content.split('\n')

    doc = Document()
    set_rtl_for_doc(doc)

    # Page setup
    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)

    # Set default style font
    style = doc.styles['Normal']
    style.font.name = 'Tahoma'
    style.font.size = Pt(11)

    i = 0
    in_code_block = False
    code_buffer = []
    in_table = False
    table_header = []
    table_rows = []
    numbered_counter = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Code block handling
        if stripped.startswith('```'):
            if in_code_block:
                # End of code block
                add_code_block(doc, '\n'.join(code_buffer))
                code_buffer = []
                in_code_block = False
            else:
                # Start of code block - flush any pending table
                if in_table and table_rows:
                    add_table(doc, table_header, table_rows)
                    in_table = False
                    table_header = []
                    table_rows = []
                in_code_block = True
            i += 1
            continue
        if in_code_block:
            code_buffer.append(line)
            i += 1
            continue

        # Empty line - flush table if open
        if not stripped:
            if in_table and table_rows:
                add_table(doc, table_header, table_rows)
                in_table = False
                table_header = []
                table_rows = []
            numbered_counter = 0
            i += 1
            continue

        # Table handling
        if stripped.startswith('|') and '|' in stripped[1:]:
            if not in_table:
                in_table = True
                table_header = parse_table_row(stripped)
            elif is_separator_row(stripped):
                pass  # Skip separator
            else:
                table_rows.append(parse_table_row(stripped))
            i += 1
            continue
        else:
            # Not a table row - flush table
            if in_table and table_rows:
                add_table(doc, table_header, table_rows)
                in_table = False
                table_header = []
                table_rows = []

        # Horizontal rule
        if stripped == '---' or stripped == '***':
            add_horizontal_rule(doc)
            i += 1
            continue

        # Headings
        m = re.match(r'^(#{1,6})\s+(.+)$', stripped)
        if m:
            level = len(m.group(1))
            text = parse_inline(m.group(2))
            add_heading(doc, text, level)
            i += 1
            continue

        # Bullet list
        m = re.match(r'^(\s*)[-*]\s+(.+)$', line)
        if m:
            indent = len(m.group(1)) // 2
            text = parse_inline(m.group(2))
            add_bullet(doc, text, level=indent)
            i += 1
            continue

        # Numbered list
        m = re.match(r'^(\s*)(\d+)\.\s+(.+)$', line)
        if m:
            text = parse_inline(m.group(3))
            add_numbered(doc, text, m.group(2))
            i += 1
            continue

        # Blockquote
        if stripped.startswith('>'):
            text = parse_inline(stripped.lstrip('>').strip())
            p = doc.add_paragraph()
            set_rtl(p)
            p.paragraph_format.left_indent = Cm(1.0)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run('┃ ' + text)
            set_arabic_font(run, size=11, color=RGBColor(0x55, 0x55, 0x55))
            i += 1
            continue

        # Regular paragraph
        text = parse_inline(stripped)
        add_paragraph_styled(doc, text, size=11, space_after=4)
        i += 1

    # Flush any remaining table
    if in_table and table_rows:
        add_table(doc, table_header, table_rows)

    # Save
    doc.save(docx_path)
    print(f"[OK] Word document saved: {docx_path}")
    print(f"     Total lines: {len(lines)}")

if __name__ == '__main__':
    md = sys.argv[1] if len(sys.argv) > 1 else 'input.md'
    out = sys.argv[2] if len(sys.argv) > 2 else 'output.docx'
    convert_markdown_to_docx(md, out)
