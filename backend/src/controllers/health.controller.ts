import { Request, Response } from 'express'

// 서버 상태 확인용 컨트롤러
// Railway 헬스체크 및 모니터링 도구에서 사용
export const healthCheck = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
