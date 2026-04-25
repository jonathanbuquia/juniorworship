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
    id: 'others',
    label: 'Others',
    description: 'More surprises are coming soon.',
  },
]

export const SHOP_ITEMS = [
  {
    slug: 'sunbeam-guppy',
    category: 'fish',
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
    name: 'Mint Angel Fish',
    description: 'A graceful little swimmer with a cool mint shimmer.',
    price: 100,
    accentColor: '#76d7c4',
    bodyColor: '#89f0d0',
    finColor: '#2a9d8f',
    detailColor: '#ddfff7',
  },
]

export function findShopItemBySlug(slug) {
  return SHOP_ITEMS.find((item) => item.slug === slug) ?? null
}

export function getShopItemsByCategory(categoryId) {
  return SHOP_ITEMS.filter((item) => item.category === categoryId)
}
