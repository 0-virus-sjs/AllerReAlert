export type MealItemCategory = 'rice' | 'soup' | 'side' | 'dessert'
export type MealPlanStatus = 'draft' | 'published' | 'cancelled'

export interface MealAllergenEntry {
  allergen: { id: number; code: number; name: string }
  isAutoTagged: boolean
}

export interface MealItem {
  id: string
  category: MealItemCategory
  name: string
  calories: number | null
  allergens: MealAllergenEntry[]
}

export interface MealPlan {
  id: string
  date: string           // ISO string e.g. "2026-05-01T00:00:00.000Z"
  status: MealPlanStatus
  scheduledAt: string | null
  mealItems: MealItem[]
}

export interface MealItemInput {
  category: MealItemCategory
  name: string
  calories?: number
}
