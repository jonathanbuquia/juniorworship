import { useEffect, useId, useRef } from 'react'
import '../purchaseConfirmation.css'

export default function PurchaseConfirmation({ item, player, onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="purchase-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onCancel() }}
    >
      <div className="eyebrow">Confirm Purchase</div>
      <h2 id={titleId}>Buy {item.name}?</h2>
      <p id={descriptionId}>Please check the player and price before buying.</p>
      <dl className="purchase-confirm-details">
        <div><dt>Player</dt><dd>{player.display_name}</dd></div>
        <div><dt>Price</dt><dd className="purchase-confirm-price">{item.price.toLocaleString()} gold</dd></div>
        <div><dt>Gold after purchase</dt><dd>{(player.gold - item.price).toLocaleString()} gold</dd></div>
      </dl>
      <div className="purchase-confirm-actions">
        <button type="button" className="ghost-button" autoFocus onClick={onCancel}>CANCEL</button>
        <button type="button" className="primary-button" onClick={onConfirm}>OKAY</button>
      </div>
    </dialog>
  )
}
