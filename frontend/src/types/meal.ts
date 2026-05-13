export type MealItemCategory = 'rice' | 'soup' | 'side' | 'dessert'
export type MealPlanStatus = 'draft' | 'published' | 'cancelled'
export type AlternatePlanStatus = 'draft' | 'confirmed'

export interface AllergenRef {
  id: string      // cuid
  code: number    // 식약처 코드 1-19
  name: string
}

export interface MealAllergenEntry {
  allergen: AllergenRef
  isAutoTagged: boolean
}

export interface MealItem {
  id: string
  category: MealItemCategory
  name: string
  ingredients: string | null
  calories: number | null
  allergens: MealAllergenEntry[]
}

export interface AlternateItem {
  id: string
  name: string
  calories: number | null
  replacesItem: {
    id: string
    name: string
    category: MealItemCategory
  }
}

export interface AlternatePlan {
  id: string
  status: AlternatePlanStatus
  targetAllergen: AllergenRef
  items: AlternateItem[]
}

export interface MealPlan {
  id: string
  date: string              // ISO string e.g. "2026-05-01T00:00:00.000Z"
  status: MealPlanStatus
  scheduledAt: string | null
  items: MealItem[]         // Prisma 필드명 = items (mealItems 아님)
  alternatePlans: AlternatePlan[]
}

export interface MealItemNutrients {
  carbs?: number
  protein?: number
  fat?: number
}

export interface MealItemInput {
  category: MealItemCategory
  name: string
  ingredients?: string
  calories?: number
  nutrients?: MealItemNutrients
}

export interface CreateAlternateInput {
  targetAllergenId: string
  items: Array<{
    replacesItemId: string
    name: string
    calories?: number
    nutrients?: Record<string, unknown>
  }>
}
