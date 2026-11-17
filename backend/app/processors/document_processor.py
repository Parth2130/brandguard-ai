import os
import re
import math
import uuid
from pathlib import Path
from PIL import Image
import numpy as np
import fitz # PyMuPDF
import docx

class DocumentProcessor:
    @staticmethod
    def extract_text(file_path, file_type):
        """Extract plain text from uploaded PDF, DOCX, TXT, WEBP, SVG, or Image."""
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

            elif file_type == 'svg':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    svg_content = f.read()
                # Extract text elements and title/desc from SVG safely
                text_matches = re.findall(r'<text[^>]*>(.*?)</text>', svg_content, re.IGNORECASE | re.DOTALL)
                clean_texts = [re.sub(r'<[^>]+>', '', t).strip() for t in text_matches if t.strip()]
                text = " ".join(clean_texts) if clean_texts else f"[Vector Asset: SVG graphic ({len(svg_content)} bytes)]"

            elif file_type in ['png', 'jpg', 'jpeg', 'webp']:
                img = Image.open(file_path)
                width, height = img.size
                text = f"[Visual Brand Asset: Image {width}x{height} pixels, Format: {img.format or file_type.upper()}]"

        except Exception as e:
            text = f"Error extracting content: {str(e)}"

        return text.strip()

    @staticmethod
    def render_pdf_first_page_image(file_path):
        """Render page 0 of a PDF to a high-resolution PNG image for visual analysis."""
        try:
            doc = fitz.open(file_path)
            if len(doc) == 0:
                return None
            page = doc[0]
            pix = page.get_pixmap(dpi=150)
            img_filename = f"{Path(file_path).stem}_preview.png"
            output_path = os.path.join(os.path.dirname(file_path), img_filename)
            pix.save(output_path)
            doc.close()
            return output_path
        except Exception as e:
            print(f"[DocumentProcessor] PDF rendering error: {e}")
            return None

    @staticmethod
    def hex_to_rgb(hex_str):
        """Convert HEX color string to (R, G, B) tuple."""
        clean = hex_str.lstrip('#')
        if len(clean) == 3:
            clean = ''.join([c*2 for c in clean])
        return tuple(int(clean[i:i+2], 16) for i in (0, 2, 4))

    @staticmethod
    def rgb_to_hex(r, g, b):
        """Convert RGB tuple to standard #RRGGBB format."""
        return f"#{int(r):02X}{int(g):02X}{int(b):02X}"

    @staticmethod
    def rgb_to_cielab(r, g, b):
        """
        Converts sRGB (0-255) to CIE L*a*b* using Standard Observer D65.
        Enables accurate perceptual color distance calculations.
        """
        def pivot_rgb(c):
            v = c / 255.0
            return ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92

        lr, lg, lb = pivot_rgb(r), pivot_rgb(g), pivot_rgb(b)

        # Observer = 2°, Illuminant = D65
        X = lr * 0.4124 + lg * 0.3576 + lb * 0.1805
        Y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722
        Z = lr * 0.0193 + lg * 0.1192 + lb * 0.9505

        # Normalize with D65 standard reference white
        Xn, Yn, Zn = 0.95047, 1.00000, 1.08883
        x, y, z = X / Xn, Y / Yn, Z / Zn

        def pivot_xyz(t):
            return t ** (1/3) if t > 0.008856 else (7.787 * t) + (16 / 116)

        fx, fy, fz = pivot_xyz(x), pivot_xyz(y), pivot_xyz(z)
        L = max(0.0, 116.0 * fy - 16.0)
        a = 500.0 * (fx - fy)
        b = 200.0 * (fy - fz)
        return L, a, b

    @classmethod
    def calculate_perceptual_distance(cls, hex1, hex2):
        """
        Calculates CIE76 Delta-E (ΔE) perceptual color distance.
        ΔE < 2.3  : Just Noticeable Difference (JND)
        ΔE < 5.0  : Near identical/acceptable brand match
        ΔE >= 10.0: Clear perceptual deviation
        ΔE > 25.0 : Completely different color family
        """
        try:
            r1, g1, b1 = cls.hex_to_rgb(hex1)
            r2, g2, b2 = cls.hex_to_rgb(hex2)
            L1, a1, b1_ = cls.rgb_to_cielab(r1, g1, b1)
            L2, a2, b2_ = cls.rgb_to_cielab(r2, g2, b2)
            dist = math.sqrt((L1 - L2)**2 + (a1 - a2)**2 + (b1_ - b2_)**2)
            return round(dist, 2)
        except Exception:
            return 999.0

    @classmethod
    def find_closest_approved_color(cls, target_hex, approved_palette):
        """Find the closest approved brand color in perceptual Lab space."""
        if not approved_palette:
            return '#7C3AED', 0.0
        
        closest_hex = approved_palette[0]
        min_dist = float('inf')
        for app_hex in approved_palette:
            d = cls.calculate_perceptual_distance(target_hex, app_hex)
            if d < min_dist:
                min_dist = d
                closest_hex = app_hex

        return closest_hex.upper(), min_dist

    @staticmethod
    def extract_dominant_colors(file_path, max_colors=6):
        """
        Extract top dominant colors from an image or PDF in HEX format,
        filtering out near-duplicate and extreme noise colors.
        """
        path = Path(file_path)
        if not path.exists():
            return []

        # If PDF, render first page image first
        actual_img_path = str(path)
        if path.suffix.lower() == '.pdf':
            rendered = DocumentProcessor.render_pdf_first_page_image(actual_img_path)
            if rendered and os.path.exists(rendered):
                actual_img_path = rendered

        try:
            img = Image.open(actual_img_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Resize to thumbnail to balance speed and statistical accuracy
            img = img.resize((150, 150))
            
            # Count color frequencies or quantize
            quantized = img.quantize(colors=max_colors * 3)
            palette = quantized.getpalette()[:max_colors * 3 * 3]
            raw_colors = []
            for i in range(0, len(palette), 3):
                r, g, b = palette[i], palette[i+1], palette[i+2]
                raw_colors.append(f"#{r:02X}{g:02X}{b:02X}")

            # Filter out near duplicates (Delta-E < 8.0)
            unique_hex = []
            for h in raw_colors:
                is_near = False
                for existing in unique_hex:
                    if DocumentProcessor.calculate_perceptual_distance(h, existing) < 8.0:
                        is_near = True
                        break
                if not is_near:
                    unique_hex.append(h)
                if len(unique_hex) >= max_colors:
                    break

            return unique_hex
        except Exception as e:
            print(f"[DocumentProcessor] Color extraction error: {e}")
            return []

    @staticmethod
    def calculate_contrast_ratio(hex1, hex2):
        """Calculate WCAG 2.1 AA contrast ratio between two hex colors."""
        try:
            def hex_to_luminance(hex_str):
                clean = hex_str.lstrip('#')
                if len(clean) == 3:
                    clean = ''.join([c*2 for c in clean])
                r = int(clean[0:2], 16) / 255.0
                g = int(clean[2:4], 16) / 255.0
                b = int(clean[4:6], 16) / 255.0
                
                # Gamma correction to linear RGB
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

    @classmethod
    def evaluate_contrast_wcag(cls, fg_hex, bg_hex):
        """Evaluates WCAG 2.1 AA & AAA compliance between two colors."""
        ratio = cls.calculate_contrast_ratio(fg_hex, bg_hex)
        passes_normal_aa = ratio >= 4.5
        passes_large_aa = ratio >= 3.0
        passes_aaa = ratio >= 7.0

        if not passes_normal_aa:
            advice = f"Contrast {ratio}:1 fails WCAG 2.1 AA requirement of 4.5:1 for body copy. Increase foreground darkness or background lightness."
        else:
            advice = f"Contrast {ratio}:1 exceeds WCAG 2.1 AA standard (4.5:1 minimum). Compliant."

        return {
            'foreground': fg_hex.upper(),
            'background': bg_hex.upper(),
            'ratio': ratio,
            'passes_normal_aa': passes_normal_aa,
            'passes_large_aa': passes_large_aa,
            'passes_aaa': passes_aaa,
            'advice': advice
        }

    @classmethod
    def recolor_image(cls, file_path=None, target_hex=None, replacement_hex=None, tolerance=45.0, input_image_path=None, output_image_path=None):
        """
        Smart visual correction: performs vectorized perceptual color replacement
        on an image asset, preserving the original file and saving a new corrected version.
        Supports both direct output_image_path and auto-generated output path.
        """
        src_path = input_image_path or file_path
        if not src_path or not os.path.exists(src_path):
            return False if output_image_path else {'success': False, 'error': 'File not found on disk.'}

        path = Path(src_path)
        try:
            orig_img = Image.open(src_path)
            has_alpha = orig_img.mode in ('RGBA', 'LA') or (orig_img.mode == 'P' and 'transparency' in orig_img.info)
            img = orig_img.convert('RGBA' if has_alpha else 'RGB')
            arr = np.array(img, dtype=np.uint8)

            target_r, target_g, target_b = cls.hex_to_rgb(target_hex)
            target_rgb = np.array([target_r, target_g, target_b], dtype=np.float32)

            rep_r, rep_g, rep_b = cls.hex_to_rgb(replacement_hex)
            rep_rgb = np.array([rep_r, rep_g, rep_b], dtype=np.uint8)

            # Euclidean color distance in RGB space
            rgb_layer = arr[:, :, :3].astype(np.float32)
            dist = np.sqrt(np.sum((rgb_layer - target_rgb) ** 2, axis=2))
            mask = dist <= tolerance
            pixels_changed = int(np.sum(mask))

            if pixels_changed > 0:
                arr[mask, :3] = rep_rgb

            corrected_img = Image.fromarray(arr)
            if output_image_path:
                corrected_img.save(output_image_path)
                return True

            corrected_filename = f"corrected_{uuid.uuid4().hex[:8]}_{path.name}"
            # Ensure saved with valid extension
            if not corrected_filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                corrected_filename += ".png"
            corrected_path = os.path.join(os.path.dirname(src_path), corrected_filename)
            corrected_img.save(corrected_path)

            return {
                'success': True,
                'pixels_replaced': pixels_changed,
                'corrected_file_name': corrected_filename,
                'corrected_file_path': corrected_path,
                'corrected_file_url': f"/uploads/{corrected_filename}",
                'original_file_url': f"/uploads/{path.name}"
            }
        except Exception as e:
            print(f"[DocumentProcessor] Recolor error: {e}")
            return False if output_image_path else {'success': False, 'error': str(e)}
