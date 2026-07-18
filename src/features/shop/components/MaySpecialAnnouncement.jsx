import AnnouncementCrabPreview from './AnnouncementCrabPreview.jsx'
import { JULY_EVENT_CRAB_SLUG, findShopItemBySlug, formatRequirementsSummary } from '../../../../shared/shopCatalog.js'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getLastSundayOfMonth(value = new Date()) {
  const lastDayOfMonth = new Date(value.getFullYear(), value.getMonth() + 1, 0)
  lastDayOfMonth.setDate(lastDayOfMonth.getDate() - lastDayOfMonth.getDay())

  return lastDayOfMonth
}

export default function MaySpecialAnnouncement() {
  const item = findShopItemBySlug(JULY_EVENT_CRAB_SLUG)
  const saleEndDate = getLastSundayOfMonth()
  const saleEndLabel = `${MONTH_NAMES[saleEndDate.getMonth()]} ${saleEndDate.getDate()}`
  const monthSpecialLabel = `${MONTH_NAMES[new Date().getMonth()]} Special`
  const abilityLabels = item.abilities ?? []
  const requirementsLabel = item.requirements?.length ? formatRequirementsSummary(item.requirements) : ''

  return (
    <section className="may-special-announcement panel">
      <div className="may-special-copy">
        <div className="eyebrow">Announcement</div>
        <p className="may-special-kicker">{monthSpecialLabel}</p>
        <h1>{item.name}</h1>
        <p className="may-special-lede">Event shop sale until {saleEndLabel}.</p>

        <div className="may-special-price" aria-label="Monthly special sale price">
          {item.isOnSale ? <span className="sale-pill">Sale</span> : null}
          <strong>{item.price} gold</strong>
          {item.isOnSale ? <del>{item.originalPrice} gold</del> : null}
        </div>

        {abilityLabels.length ? (
          <div className="may-special-abilities" aria-label="Monthly special details">
            {abilityLabels.map((ability) => (
              <span key={ability}>{ability}</span>
            ))}
          </div>
        ) : null}

        {requirementsLabel ? (
          <p className="may-special-requirement">
            <strong>Requires:</strong> {requirementsLabel}
          </p>
        ) : null}

        <p className="may-special-note">Back to {item.originalPrice} gold after {saleEndLabel}. Available in Events.</p>
      </div>

      <div className="may-special-visual" aria-hidden="true">
        <div className="announcement-ocean-decor">
          <span className="announcement-bubble bubble-one" />
          <span className="announcement-bubble bubble-two" />
          <span className="announcement-bubble bubble-three" />
          <span className="announcement-coral coral-left" />
          <span className="announcement-coral coral-right" />
          <span className="announcement-seaweed seaweed-left" />
          <span className="announcement-seaweed seaweed-right" />
          <span className="announcement-rock rock-left" />
          <span className="announcement-rock rock-right" />
        </div>
        <AnnouncementCrabPreview />
      </div>
    </section>
  )
}
