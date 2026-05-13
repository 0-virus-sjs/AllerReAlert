import { api } from './api'

interface ApiOk<T> { success: boolean; data: T }

export interface NeisSchool {
  atptCode:   string
  atptName:   string
  schoolCode: string
  name:       string
  address:    string | null
  kind:       string
}

export async function searchNeisSchools(q: string): Promise<NeisSchool[]> {
  if (q.length < 2) return []
  const { data } = await api.get<ApiOk<NeisSchool[]>>('/neis/schools', { params: { q } })
  return data.data
}
