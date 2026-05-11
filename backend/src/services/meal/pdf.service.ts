import PDFDocument from 'pdfkit'
import { getMealPlans } from './meal.service'
import { prisma } from '../../lib/prisma'
import { registerKoreanFonts } from '../../lib/pdf-fonts'

const CATEGORY_LABEL: Record<string, string> = {
  rice: '밥', soup: '국', side: '반찬', dessert: '후식',
}

interface PdfOptions {
  orgId: string
  month: string         // YYYY-MM
  userId: string
}

/**
 * 월간 식단 PDF 스트림을 반환한다.
 * 본인 알레르기(confirmed UserAllergen)와 교집합이 있는 메뉴는 ⚠️ 표시.
 */
export async function generateMealPdf(options: PdfOptions): Promise<Buffer> {
  const { orgId, month, userId } = options

  const [rawPlans, org, userAllergens] = await Promise.all([
    getMealPlans(orgId, month),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.userAllergen.findMany({
      where: { userId, status: 'confirmed' },
      include: { allergen: { select: { code: true, name: true } } },
    }),
  ])

  // getMealPlans 내부 캐시가 unknown을 반환할 수 있어 타입 단언
  const plans = rawPlans as Array<{
    date: Date | string
    status: string
    items: Array<{ category: string; name: string; allergens: Array<{ allergen: { code: number } }> }>
  }>

  const dangerCodes = new Set(userAllergens.map((ua) => ua.allergen.code))

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    registerKoreanFonts(doc)
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ── 헤더 ───────────────────────────────────────────
    doc.fontSize(16).font('Korean-Bold')
      .text(`${org?.name ?? '학교'} 급식 식단표`, { align: 'center' })
    doc.fontSize(11).font('Korean')
      .text(month, { align: 'center' })
    doc.moveDown(0.5)

    if (dangerCodes.size > 0) {
      const names = userAllergens.map((ua) => ua.allergen.name).join(', ')
      doc.fontSize(9).fillColor('red')
        .text(`※ 주의 알레르기: ${names}`, { align: 'left' })
      doc.fillColor('black')
    }

    doc.moveDown(0.5)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke()
    doc.moveDown(0.5)

    // ── 날짜별 식단 ─────────────────────────────────────
    if (plans.length === 0) {
      doc.fontSize(10).text('등록된 식단이 없습니다.')
    }

    for (const plan of plans) {
      const dateStr = new Date(plan.date).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      })
      const statusLabel = plan.status === 'published' ? '공개' : '초안'

      doc.fontSize(10).font('Korean-Bold')
        .text(`${dateStr}  [${statusLabel}]`, { continued: false })
      doc.font('Korean')

      if (plan.items.length === 0) {
        doc.fontSize(9).fillColor('gray').text('  식단 없음')
        doc.fillColor('black')
      }

      for (const item of plan.items) {
        const allergenCodes = item.allergens.map((a: { allergen: { code: number } }) => a.allergen.code)
        const isDangerous = allergenCodes.some((c: number) => dangerCodes.has(c))
        const allergenStr = allergenCodes.length > 0 ? `  [${allergenCodes.join(', ')}]` : ''
        const prefix = isDangerous ? '※ ' : '• '
        const catLabel = CATEGORY_LABEL[item.category] ?? item.category

        doc.fontSize(9)
          .fillColor(isDangerous ? 'red' : 'black')
          .text(`  ${prefix}[${catLabel}] ${item.name}${allergenStr}`)
      }

      doc.fillColor('black').moveDown(0.3)
    }

    // ── 푸터 ───────────────────────────────────────────
    doc.fontSize(7).fillColor('gray')
      .text(
        `생성일: ${new Date().toLocaleString('ko-KR')}  ·  알레르기 번호: 1.난류 2.우유 3.메밀 4.땅콩 5.대두 6.밀 7.고등어 8.게 9.새우 10.돼지고기 11.복숭아 12.토마토 13.아황산류 14.호두 15.닭고기 16.쇠고기 17.오징어 18.조개류 19.잣`,
        { align: 'left' }
      )

    doc.end()
  })
}
