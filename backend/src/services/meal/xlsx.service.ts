import ExcelJS from 'exceljs'
import { getMealPlans } from './meal.service'
import { prisma } from '../../lib/prisma'

const CATEGORIES = ['rice', 'soup', 'side', 'dessert'] as const

// 알레르기 해당 메뉴 셀 강조색
const DANGER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF0AA' },  // 연노란색
}

interface XlsxOptions {
  orgId: string
  month: string   // YYYY-MM
  userId: string
}

/**
 * T-141: 월간 식단 xlsx 버퍼를 반환한다.
 * 날짜 × 카테고리 행렬 레이아웃, 본인 확정 알레르기 메뉴는 셀 배경 강조.
 */
export async function generateMealXlsx(options: XlsxOptions): Promise<Buffer> {
  const { orgId, month, userId } = options

  const [rawPlans, org, userAllergens] = await Promise.all([
    getMealPlans(orgId, month),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.userAllergen.findMany({
      where: { userId, status: 'confirmed' },
      include: { allergen: { select: { code: true, name: true } } },
    }),
  ])

  const plans = rawPlans as Array<{
    date: Date | string
    status: string
    items: Array<{ category: string; name: string; allergens: Array<{ allergen: { code: number } }> }>
  }>

  const dangerCodes = new Set(userAllergens.map((ua) => ua.allergen.code))
  const allergenNames = userAllergens.map((ua) => ua.allergen.name).join(', ')

  const wb = new ExcelJS.Workbook()
  wb.creator = 'AllerReAlert'
  const ws = wb.addWorksheet(month)

  // ── 헤더 행 ──────────────────────────────────────────
  ws.mergeCells('A1:E1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `${org?.name ?? '학교'} 급식 식단표 (${month})`
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 30

  if (dangerCodes.size > 0) {
    ws.mergeCells('A2:E2')
    const warnCell = ws.getCell('A2')
    warnCell.value = `※ 주의 알레르기: ${allergenNames}`
    warnCell.font = { color: { argb: 'FFCC0000' }, italic: true, size: 10 }
    warnCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } }
  }

  // ── 열 헤더 (날짜 | 밥 | 국 | 반찬 | 후식) ──────────
  const headerRow = ws.addRow(['날짜', '밥', '국', '반찬', '후식'])
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCFECF3' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top:    { style: 'thin' },
      bottom: { style: 'thin' },
      left:   { style: 'thin' },
      right:  { style: 'thin' },
    }
  })

  ws.getColumn(1).width = 14  // 날짜
  ws.getColumn(2).width = 20  // 밥
  ws.getColumn(3).width = 20  // 국
  ws.getColumn(4).width = 28  // 반찬
  ws.getColumn(5).width = 16  // 후식

  // ── 날짜별 데이터 행 ─────────────────────────────────
  const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']

  for (const plan of plans) {
    const d = new Date(plan.date)
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const dow = KO_DAYS[d.getUTCDay()]
    const dateLabel = `${mm}/${dd}(${dow})`

    const rowData: string[] = [dateLabel]
    const isDanger: boolean[] = [false]  // 날짜 셀은 강조 없음

    for (const cat of CATEGORIES) {
      const item = plan.items.find((it) => it.category === cat)
      if (!item) {
        rowData.push('-')
        isDanger.push(false)
        continue
      }
      const hasDanger = item.allergens.some((a) => dangerCodes.has(a.allergen.code))
      rowData.push(item.name)
      isDanger.push(hasDanger)
    }

    const row = ws.addRow(rowData)
    row.eachCell((cell, colIdx) => {
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
      }
      if (isDanger[colIdx - 1]) {
        cell.fill = DANGER_FILL
        cell.font = { color: { argb: 'FF993300' }, bold: true }
      }
    })
    row.height = 22
  }

  return wb.xlsx.writeBuffer().then((ab) => Buffer.from(ab))
}
