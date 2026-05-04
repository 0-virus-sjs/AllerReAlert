export type AllergenStatus = 'pending' | 'confirmed' | 'rejected'

export interface MasterAllergen {
  id: string
  code: number
  name: string
  iconUrl?: string | null
}

export interface UserAllergen {
  id: string
  allergen: MasterAllergen
  customAllergenName: string | null
  status: AllergenStatus
  approver: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}
