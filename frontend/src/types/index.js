// 프로젝트 공통 타입 정의 (JSDoc)
// TypeScript 전환 시 .ts 파일로 교체

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {'user'|'admin'} role
 */

/**
 * @typedef {Object} School
 * @property {string} id
 * @property {string} neisCode
 * @property {string} name
 * @property {string} region
 */

/**
 * @typedef {Object} MealItem
 * @property {string} name         - 메뉴 이름 (예: "잡곡밥")
 * @property {number[]} allergens  - 알레르기 코드 배열 (예: [1, 5])
 */

/**
 * @typedef {Object} Meal
 * @property {string} id
 * @property {string} schoolId
 * @property {string} date
 * @property {MealItem[]} menu
 */

// TODO: API 응답 공통 타입
// TODO: 알레르기 코드 enum
export {}
