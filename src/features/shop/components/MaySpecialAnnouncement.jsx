import { MAY_EVENT_BETTA_SLUG, findShopItemBySlug } from '../../../../shared/shopCatalog.js'
import ShopFishPreview from './ShopFishPreview.jsx'

export default function MaySpecialAnnouncement({ onOpenShop }) {
  const item = findShopItemBySlug(MAY_EVENT_BETTA_SLUG)

  if (!item) {
    return null
  }

  const abilityLabels = item.abilities ?? []

  return (
    <section className="may-special-announcement panel">
      <div className="may-special-copy">
        <div className="eyebrow">Announcement</div>
        <p className="may-special-kicker">May Special</p>
        <h1>{item.name}</h1>
        <p className="may-special-lede">Event creature available until May 31.</p>

        <div className="may-special-price" aria-label="May special sale price">
          {item.isOnSale ? <span className="sale-pill">Sale</span> : null}
          <strong>{item.price} gold</strong>
          {item.isOnSale ? <del>{item.originalPrice} gold</del> : null}
        </div>

        {abilityLabels.length ? (
          <div className="may-special-abilities" aria-label="May special abilities">
            {abilityLabels.map((ability) => (
              <span key={ability}>{ability}</span>
            ))}
          </div>
        ) : null}

        <p className="may-special-note">Back to {item.originalPrice} gold after May 31.</p>
        <button className="primary-button may-special-button" onClick={onOpenShop} type="button">
          Open Events Shop
        </button>
      </div>

      <div className="may-special-visual" aria-hidden="true">
        <ShopFishPreview className="announcement-fish-preview" item={item} />
      </div>
    </section>
  )
}
