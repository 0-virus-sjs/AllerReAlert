import PDFDocument from 'pdfkit'
import type { AllergyOverviewItem, DailyDemandItem, MonthlyReport } from './analytics.service'
import { registerKoreanFonts } from '../../lib/pdf-fonts'

// ── T-083: CSV 생성 ──────────────────────────────────────────────────────────

export function generateAnalyticsCsv(
  overview: AllergyOverviewItem[],
  demand: DailyDemandItem[],
  report: MonthlyReport,
): string {
  const lines: string[] = []

  // 섹션 1: 알레르기 유형별 분포
  lines.push('# 알레르기 유형별 분포')
  lines.push('알레르기명,코드번호,보유인원')
  for (const row of overview) {
    lines.push(`${row.name},${row.code},${row.count}`)
  }

  lines.push('')

  // 섹션 2: 일별 대체식 수요
  lines.push('# 일별 대체식 수요')
  lines.push('날짜,총인원,주요알레르기(상위3)')
  for (const row of demand) {
    const top3 = row.allergenBreakdown
      .slice(0, 3)
      .map((a) => `${a.name}(${a.count}명)`)
      .join(' | ')
    lines.push(`${row.date},${row.totalCount},${top3}`)
  }

  lines.push('')

  // 섹션 3: 월간 운영 리포트
  lines.push('# 월간 운영 리포트')
  lines.push('항목,값')
  lines.push(`집계 월,${report.month}`)
  lines.push(`알림 발송 건수,${report.notificationCount}`)
  lines.push(`대체식 제공 건수,${report.alternateMealCount}`)
  lines.push(`설문 참여율,${(report.surveyParticipationRate * 100).toFixed(1)}%`)
  lines.push(`마감된 설문 수,${report.surveyCount}`)

  return '﻿' + lines.join('\r\n')  // BOM for Excel 호환
}

// ── T-083: PDF 생성 ──────────────────────────────────────────────────────────

export async function generateAnalyticsPdf(
  overview: AllergyOverviewItem[],
  demand: DailyDemandItem[],
  report: MonthlyReport,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    registerKoreanFonts(doc)
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ── 표지 ───────────────────────────────────────────────────────────────
    doc.fontSize(18).font('Korean-Bold')
      .text('수요 집계 대시보드', { align: 'center' })
    doc.fontSize(12).font('Korean')
      .text(`${report.month} 운영 리포트`, { align: 'center' })
    doc.moveDown()
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke()
    doc.moveDown()

    // ── 섹션 1: 월간 핵심 지표 ─────────────────────────────────────────────
    doc.fontSize(13).font('Korean-Bold').text('1. 월간 핵심 지표')
    doc.fontSize(10).font('Korean')
    doc.moveDown(0.5)

    const kpiRows = [
      ['알림 발송 건수', `${report.notificationCount} 건`],
      ['대체식 제공 건수', `${report.alternateMealCount} 건`],
      ['설문 참여율', `${(report.surveyParticipationRate * 100).toFixed(1)}%  (마감 설문 ${report.surveyCount}건)`],
    ]
    for (const [label, value] of kpiRows) {
      doc.text(`  • ${label}: `, { continued: true }).font('Korean-Bold').text(value)
      doc.font('Korean')
    }
    doc.moveDown()

    // ── 섹션 2: 알레르기 유형별 분포 ───────────────────────────────────────
    doc.fontSize(13).font('Korean-Bold').text('2. 알레르기 유형별 분포')
    doc.fontSize(9).font('Korean')
    doc.moveDown(0.5)

    const colWidths = [200, 80, 80]
    const tableHeaders = ['알레르기명', '코드번호', '보유인원']
    drawTableRow(doc, tableHeaders, colWidths, true)

    for (const row of overview.slice(0, 20)) {
      drawTableRow(doc, [row.name, String(row.code), `${row.count}명`], colWidths, false)
    }
    doc.moveDown()

    // ── 섹션 3: 일별 대체식 수요 ───────────────────────────────────────────
    doc.fontSize(13).font('Korean-Bold').text('3. 일별 대체식 수요')
    doc.fontSize(9).font('Korean')
    doc.moveDown(0.5)

    const demandColWidths = [120, 80, 260]
    const demandHeaders   = ['날짜', '총인원', '주요 알레르기 (상위 3)']
    drawTableRow(doc, demandHeaders, demandColWidths, true)

    for (const row of demand) {
      const top3 = row.allergenBreakdown
        .slice(0, 3)
        .map((a) => `${a.name}(${a.count}명)`)
        .join('  ')
      drawTableRow(
        doc,
        [row.date, `${row.totalCount}명`, top3 || '-'],
        demandColWidths,
        false,
      )
    }

    // ── 푸터 ───────────────────────────────────────────────────────────────
    doc.moveDown()
    doc.fontSize(7).fillColor('gray')
      .text(`생성일: ${new Date().toLocaleString('ko-KR')}`, { align: 'right' })

    doc.end()
  })
}

function drawTableRow(doc: PDFKit.PDFDocument, cells: string[], widths: number[], isHeader: boolean) {
  const x0 = 40
  const rowHeight = 16
  const y = doc.y

  if (isHeader) {
    doc.rect(x0, y, widths.reduce((a, b) => a + b, 0), rowHeight).fill('#e9ecef')
    doc.fillColor('black')
  }

  let x = x0
  doc.font(isHeader ? 'Korean-Bold' : 'Korean').fontSize(9)
  for (let i = 0; i < cells.length; i++) {
    doc.text(cells[i], x + 3, y + 4, { width: widths[i] - 6, ellipsis: true, lineBreak: false })
    x += widths[i]
  }

  // 테두리
  x = x0
  for (const w of widths) {
    doc.rect(x, y, w, rowHeight).stroke()
    x += w
  }

  doc.y = y + rowHeight
}
