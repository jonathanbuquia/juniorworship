export const ADMIN_PATH = '/admin'
export const ATTENDANCE_PATH = '/attendance'
export const MEMORY_PATH = '/memory-verse'
export const QUIZ_PATH = '/quiz'
export const SHOP_PATH = '/shop'

export const ADMIN_SECTIONS = {
  createPlayer: 'create-player',
  manageGold: 'manage-gold',
  deletePlayer: 'delete-player',
}

export const QUICK_GOLD_ACTIONS = [25, 50, 100, -25, -50, -100]
export const QUIZ_QUESTION_COUNT = 5
export const GOLD_PER_QUIZ_POINT = 20
export const MEMORY_VERSE_QUIZ_POINTS = 5
export const MEMORY_VERSE_STORAGE_KEY = 'memory-verse-helper'
export const QUIZ_STORAGE_KEY = 'quiz-helper'
export const ATTENDANCE_STORAGE_KEY = 'attendance-records:v1'
export const ATTENDANCE_WEEK_COUNT = 16
export const SHOP_NOTICE_DURATION = 3200

export const RAIL_TRANSITION = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
}

export const POPOVER_TRANSITION = {
  duration: 0.2,
  ease: 'easeOut',
}
