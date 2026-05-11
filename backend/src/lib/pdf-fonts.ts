import path from 'path'

const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts')

export const KOREAN_FONT = {
  regular: path.join(FONTS_DIR, 'NotoSansKR-Regular.otf'),
  bold: path.join(FONTS_DIR, 'NotoSansKR-Bold.otf'),
}

export function registerKoreanFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont('Korean', KOREAN_FONT.regular)
  doc.registerFont('Korean-Bold', KOREAN_FONT.bold)
}
