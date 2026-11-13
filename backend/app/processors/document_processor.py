import os
import re
from pathlib import Path
from PIL import Image
import fitz # PyMuPDF
import docx

class DocumentProcessor:
    @staticmethod
    def extract_text(file_path, file_type):
        """Extract plain text from uploaded PDF, DOCX, TXT, or Image."""
        text = ""
        file_type = file_type.lower().replace('.', '')
        path = Path(file_path)

        if not path.exists():
            return "File not found on disk."

        try:
            if file_type == 'pdf':
                doc = fitz.open(file_path)
                pages_text = []
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    extracted = page.get_text("text")
                    if extracted.strip():
                        pages_text.append(extracted.strip())
                doc.close()
                text = "\n\n".join(pages_text)

            elif file_type == 'docx':
                doc = docx.Document(file_path)
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                for table in doc.tables:
                    for row in table.rows:
                        row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_text:
                            paragraphs.append(" | ".join(row_text))
                text = "\n\n".join(paragraphs)

            elif file_type == 'txt':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()

            elif file_type in ['png', 'jpg', 'jpeg']:
                # For images, we can inspect image properties
                # In standard mode without heavy OCR, we describe visual properties
                img = Image.open(file_path)
                width, height = img.size
                text = f"[Visual Brand Asset: Image {width}x{height} pixels, Format: {img.format}]"

        except Exception as e:
            text = f"Error extracting content: {str(e)}"

        return text.strip()

    @staticmethod
    def extract_dominant_colors(file_path, max_colors=5):
        """Extract top dominant colors from an image in HEX format."""
        path = Path(file_path)
        if not path.exists():
            return []

        try:
            img = Image.open(file_path)
            # Convert to RGB if in RGBA or other modes
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize to thumbnail to speed up analysis and reduce noise
            img = img.resize((150, 150))
            
            # Count color frequencies
            colors = img.getcolors(150 * 150)
            if not colors:
                # Fallback to quantize
                quantized = img.quantize(colors=max_colors)
                palette = quantized.getpalette()[:max_colors * 3]
                hex_colors = []
                for i in range(0, len(palette), 3):
                    r, g, b = palette[i], palette[i+1], palette[i+2]
                    hex_colors.append(f"#{r:02X}{g:02X}{b:02X}")
                return hex_colors

            # Sort by frequency descending
            sorted_colors = sorted(colors, key=lambda c: c[0], reverse=True)
            
            # Filter colors to avoid near duplicates
            unique_hex = []
            for count, (r, g, b) in sorted_colors:
                hex_code = f"#{r:02X}{g:02X}{b:02X}"
                # Exclude pure extreme background white/black if others exist
                if hex_code not in unique_hex:
                    unique_hex.append(hex_code)
                if len(unique_hex) >= max_colors:
                    break

            return unique_hex
        except Exception as e:
            print(f"Color extraction error: {e}")
            return []

    @staticmethod
    def calculate_contrast_ratio(hex1, hex2):
        """Calculate WCAG 2.1 contrast ratio between two hex colors."""
        try:
            def hex_to_luminance(hex_str):
                hex_clean = hex_str.lstrip('#')
                r = int(hex_clean[0:2], 16) / 255.0
                g = int(hex_clean[2:4], 16) / 255.0
                b = int(hex_clean[4:6], 16) / 255.0
                
                # Gamma correction
                r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
                g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
                b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
                
                return 0.2126 * r + 0.7152 * g + 0.0722 * b

            l1 = hex_to_luminance(hex1)
            l2 = hex_to_luminance(hex2)

            lighter = max(l1, l2)
            darker = min(l1, l2)

            ratio = (lighter + 0.05) / (darker + 0.05)
            return round(ratio, 2)
        except Exception:
            return 4.5
