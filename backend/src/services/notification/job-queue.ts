// 알림 잡 큐 추상화 — 현재는 in-process 동기 실행
// 추후 BullMQ + Railway Redis 마이그레이션 시 이 인터페이스만 교체

export interface AlertJob {
  orgId: string
  date: Date
}

export interface JobQueue {
  enqueue(job: AlertJob): Promise<void>
}

/**
 * In-process 큐: Railway 단일 인스턴스 환경에서 즉시 실행.
 * BullMQ로 전환할 때는 이 클래스만 BullMQQueue 구현체로 교체한다.
 */
export class InProcessQueue implements JobQueue {
  private handler: ((job: AlertJob) => Promise<void>) | null = null

  onProcess(handler: (job: AlertJob) => Promise<void>) {
    this.handler = handler
  }

  async enqueue(job: AlertJob): Promise<void> {
    if (!this.handler) throw new Error('핸들러가 등록되지 않았습니다')
    await this.handler(job)
  }
}

export const alertQueue = new InProcessQueue()
