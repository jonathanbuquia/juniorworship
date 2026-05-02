export const SHOP_CATEGORIES = [
  {
    id: 'fish',
    label: 'Fish',
    description: 'Starter swimmers for young aquariums.',
  },
  {
    id: 'marine-animals',
    label: 'Marine Animals',
    description: 'Friendly sea creatures are coming soon.',
  },
  {
    id: 'deep-sea',
    label: 'Deep Sea',
    description: 'Glow-in-the-dark creatures are coming soon.',
  },
  {
    id: 'aquarium',
    label: 'Aquarium',
    description: 'Plants and decorations are coming soon.',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Monthly event special creatures will appear here.',
    tone: 'event',
  },
  {
    id: 'others',
    label: 'Others',
    description: 'More surprises are coming soon.',
  },
]

export const SHOP_RARITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'common', label: 'Common' },
  { id: 'rare', label: 'Rare' },
  { id: 'special', label: 'Special' },
]

export const MAY_EVENT_BETTA_SLUG = 'may-blue-betta'
export const MAY_EVENT_BETTA_SALE_END_DATE = '2026-05-31'

function isDateOnOrBefore(dateKey, endDateKey) {
  return String(dateKey || '') <= endDateKey
}

function createLocalDateKey(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getShopItemPrice(item, value = new Date()) {
  if (!item?.salePrice || !item?.saleEndsOn) {
    return item?.price ?? 0
  }

  return isDateOnOrBefore(createLocalDateKey(value), item.saleEndsOn) ? item.salePrice : item.price
}

function withEffectivePrice(item) {
  const currentPrice = getShopItemPrice(item)

  return {
    ...item,
    currentPrice,
    isOnSale: currentPrice < item.price,
    originalPrice: item.price,
    price: currentPrice,
  }
}

export const SHOP_ITEMS = [
  {
    slug: 'sunbeam-guppy',
    category: 'fish',
    rarity: 'common',
    name: 'Sunbeam Guppy',
    description: 'A bright starter fish with a cheerful golden tail.',
    price: 100,
    accentColor: '#ffb347',
    bodyColor: '#ffd166',
    finColor: '#ff7b54',
    detailColor: '#fff2b6',
  },
  {
    slug: 'coral-clownfish',
    category: 'fish',
    rarity: 'common',
    name: 'Coral Clownfish',
    description: 'A striped reef favorite that adds a bold orange pop.',
    price: 100,
    accentColor: '#ff8b5c',
    bodyColor: '#ff8c42',
    finColor: '#f94144',
    detailColor: '#fff8ef',
  },
  {
    slug: 'mint-angel-fish',
    category: 'fish',
    rarity: 'common',
    name: 'Mint Angel Fish',
    description: 'A graceful little swimmer with a cool mint shimmer.',
    price: 100,
    accentColor: '#76d7c4',
    bodyColor: '#89f0d0',
    finColor: '#2a9d8f',
    detailColor: '#ddfff7',
  },
  {
    slug: MAY_EVENT_BETTA_SLUG,
    category: 'events',
    rarity: 'special',
    name: 'Blue Betta Fish',
    subtitle: 'MAY SPECIAL',
    description: 'An elegant May event swimmer with royal blue fins and a cheerful sparkle.',
    price: 3000,
    salePrice: 1500,
    saleEndsOn: MAY_EVENT_BETTA_SALE_END_DATE,
    accentColor: '#2563eb',
    bodyColor: '#5ee7ff',
    finColor: '#1d4ed8',
    detailColor: '#dbeafe',
    aquariumScale: 1.16,
    speedMultiplier: 1.35,
    shopFishScale: 1.18,
    canTalk: true,
    burstDistance: 66,
    abilities: [
      'Fast click dash',
      'Talks when clicked',
      '+100 perfect quiz gold',
    ],
    talkMessages: [
      'May blessings!',
      'Perfect score sparkle!',
      'Keep swimming strong!',
      'You are amazing!',
    ],
  },
]

export function findShopItemBySlug(slug) {
  const item = SHOP_ITEMS.find((shopItem) => shopItem.slug === slug) ?? null
  return item ? withEffectivePrice(item) : null
}

export function getShopItemsByCategory(categoryId) {
  return SHOP_ITEMS.filter((item) => item.category === categoryId).map(withEffectivePrice)
}

export function getShopItemsByCategoryAndRarity(categoryId, rarityId = 'all') {
  return getShopItemsByCategory(categoryId).filter((item) => rarityId === 'all' || item.rarity === rarityId)
}
