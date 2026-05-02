import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  SHOP_CATEGORIES,
  SHOP_RARITY_FILTERS,
  getShopItemsByCategoryAndRarity,
} from '../../../../shared/shopCatalog.js'

const MotionDiv = motion.div

function ShopFishPreview({ item, index }) {
  const fishScale = item.shopFishScale ?? 1.08

  return (
    <div className="shop-card-preview">
      <span className="shop-card-glow" style={{ '--shop-glow': item.accentColor }} />
      <span className="shop-card-bubble bubble-a" />
      <span className="shop-card-bubble bubble-b" />
      <span className="shop-card-bubble bubble-c" />
      <span className="shop-card-seaweed seaweed-a" />
      <span className="shop-card-seaweed seaweed-b" />
      <motion.div
        animate={{
          rotate: [-3, 2, -3],
          x: ['-10%', '8%', '-10%'],
          y: [0, -7, 0, 5, 0],
        }}
        className="shop-fish-swim"
        transition={{
          duration: 4.8 + index * 0.55,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        <div
          className={`fish-swim shop-card-fish ${item.slug ? `fish-${item.slug}` : ''}`}
          style={{
            '--accent': item.accentColor,
            '--eye': '#1f2c46',
            '--eye-x': 0,
            '--eye-y': 0,
            '--fin': item.finColor,
            '--fish-facing': index % 2 === 0 ? 1 : -1,
            '--fish-scale': fishScale,
            '--fish-tilt': '0deg',
            '--light': item.detailColor,
            '--main': item.bodyColor,
            '--mouth': '#8b3f25',
            '--swim-x': '0px',
            '--swim-y': '0px',
          }}
        >
          <div className="fish-motion">
            <div className="fish-bob">
              <div className="fish-illustration">
                <div className="fish-tail" />
                <div className="fish-fin dorsal" />
                <div className="fish-fin side" />
                <div className="fish-fin belly" />
                <div className="fish-body">
                  <div className="fish-face" />
                  <div className="fish-eye">
                    <span className="fish-pupil">
                      <span className="eye-spark" />
                    </span>
                  </div>
                  <div className="fish-mouth" />
                  <div className="fish-gill" />
                  <div className="fish-highlight" />
                  <div className="fish-stripe stripe-a" />
                  <div className="fish-stripe stripe-b" />
                  <div className="fish-stripe stripe-c" />
                  <div className="fish-scale scale-a" />
                  <div className="fish-scale scale-b" />
                  <div className="fish-scale scale-c" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function ShopPage({
  isAdmin,
  onBuyItem,
  onCategoryChange,
  onPlayerChange,
  pendingItemSlug,
  players,
  selectedCategory,
  selectedPlayer,
  selectedPlayerId,
}) {
  const activeCategory = SHOP_CATEGORIES.find((category) => category.id === selectedCategory) ?? SHOP_CATEGORIES[0]
  const [rarityFilter, setRarityFilter] = useState('all')
  const showRarityFilters = activeCategory.id !== 'events'
  const visibleItems = useMemo(
    () => getShopItemsByCategoryAndRarity(activeCategory.id, showRarityFilters ? rarityFilter : 'all'),
    [activeCategory.id, rarityFilter, showRarityFilters],
  )

  return (
    <section className="panel shop-page-shell">
      <div className="shop-shell">
        <div className="shop-hero">
          <div>
            <div className="eyebrow">Shop</div>
            <h2>Aquarium Shop</h2>
          </div>

          <div className="shop-player-panel">
            {isAdmin ? (
              <label className="field shop-player-field">
                <select aria-label="Choose shop player" onChange={onPlayerChange} value={selectedPlayerId}>
                  <option value="">Choose player</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.display_name} - {player.gold} gold
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="shop-player-view-note">
                <strong>Admin only</strong>
              </div>
            )}
          </div>
        </div>

        <div className="shop-category-row">
          {SHOP_CATEGORIES.map((category) => (
            <button
              className={`shop-category-chip ${category.tone === 'event' ? 'event-category' : ''} ${
                selectedCategory === category.id ? 'active' : ''
              }`}
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="shop-category-copy">
          <strong>{activeCategory.label}</strong>
        </div>

        {showRarityFilters ? (
          <div className="shop-rarity-row" aria-label="Shop rarity filter">
            {SHOP_RARITY_FILTERS.map((rarity) => (
              <button
                className={`shop-rarity-chip ${rarity.id} ${rarityFilter === rarity.id ? 'active' : ''}`}
                key={rarity.id}
                onClick={() => setRarityFilter(rarity.id)}
                type="button"
              >
                {rarity.label}
              </button>
            ))}
          </div>
        ) : null}

        {visibleItems.length ? (
          <div className="shop-card-grid">
            {visibleItems.map((item, index) => {
              const needsMoreGold = selectedPlayer ? selectedPlayer.gold < item.price : false
              const rarityLabel = item.rarity ? item.rarity.toUpperCase() : ''

              return (
                <MotionDiv
                  animate={{ opacity: 1, y: 0 }}
                  className="shop-item-card"
                  initial={{ opacity: 0, y: 14 }}
                  key={item.slug}
                  transition={{ delay: index * 0.05, duration: 0.24, ease: 'easeOut' }}
                  whileHover={{ y: -4 }}
                >
                  <ShopFishPreview index={index} item={item} />

                  <div className="shop-item-copy">
                    <div className="shop-item-heading">
                      <div>
                        <strong>{item.name}</strong>
                        {item.subtitle ? <small>{item.subtitle}</small> : null}
                      </div>
                      {rarityLabel ? <span className={`shop-rarity-badge ${item.rarity}`}>{rarityLabel}</span> : null}
                    </div>

                    <div className="shop-item-footer">
                      <div className="shop-item-price">
                        <span>Price</span>
                        <strong>{item.price} gold</strong>
                      </div>
                      <button
                        className={`primary-button compact-button ${needsMoreGold ? 'warning' : ''}`}
                        disabled={!isAdmin || Boolean(pendingItemSlug)}
                        onClick={isAdmin ? () => onBuyItem(item) : undefined}
                        type="button"
                      >
                        {!isAdmin ? 'Admin only' : pendingItemSlug === item.slug ? 'Buying...' : 'Buy'}
                      </button>
                    </div>
                  </div>
                </MotionDiv>
              )
            })}
          </div>
        ) : (
          <div className="shop-coming-grid">
            {Array.from({ length: 3 }, (_unused, index) => (
              <div className="shop-coming-card" key={`${activeCategory.id}-${index}`}>
                <div className="eyebrow">Coming Soon</div>
                <strong>{activeCategory.label} slot {index + 1}</strong>
                <p className="panel-note">This part of the shop is still being prepared.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
