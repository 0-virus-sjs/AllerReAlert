import cron from 'node-cron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger'

const execAsync = promisify(exec)

// 주 1회 일요일 새벽 2시 (NFR-OPS-002: 30일 보관)
export function registerBackupJob(): void {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정 — DB 백업 잡 비활성화')
    return
  }
  cron.schedule('0 2 * * 0', () => {
    runBackup().catch((err) => logger.error({ err }, '백업 잡 예외'))
  })
  logger.info('DB 백업 잡 등록 완료 (매주 일요일 02:00)')
}

async function runBackup(): Promise<void> {
  const directUrl = process.env.DIRECT_URL
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!directUrl) {
    logger.error('백업 실패: DIRECT_URL 미설정')
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const path = `db-snapshots/${date}.sql`

  logger.info(`DB 백업 시작: ${path}`)

  try {
    const { stdout } = await execAsync(`pg_dump "${directUrl}" --no-password --clean`, {
      maxBuffer: 200 * 1024 * 1024,
    })

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase.storage
      .from('backups')
      .upload(path, Buffer.from(stdout, 'utf8'), {
        contentType: 'text/plain',
        upsert: true,
      })

    if (error) throw error
    logger.info(`DB 백업 완료: ${path}`)

    await pruneOldBackups(supabaseUrl, supabaseKey)
  } catch (err) {
    logger.error({ err }, `DB 백업 실패: ${path}`)
  }
}

// 30일 초과 스냅샷 삭제
async function pruneOldBackups(url: string, key: string): Promise<void> {
  const supabase = createClient(url, key)
  const { data: files, error } = await supabase.storage
    .from('backups')
    .list('db-snapshots', { limit: 100 })

  if (error || !files) return

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const toDelete = files
    .filter((f) => f.created_at != null && new Date(f.created_at) < cutoff)
    .map((f) => `db-snapshots/${f.name}`)

  if (toDelete.length === 0) return

  await supabase.storage.from('backups').remove(toDelete)
  logger.info(`오래된 백업 ${toDelete.length}개 삭제 완료`)
}
