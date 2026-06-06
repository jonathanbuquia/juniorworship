import JellyfishFigure from '../../../components/JellyfishFigure.jsx'

export default function AnnouncementMoonJellyPreview() {
  return (
    <div className="announcement-moon-jelly-preview">
      <div className="announcement-moon-jelly-swim">
        <div className="announcement-moon-jelly-burst" aria-hidden="true">
          <span className="moon-bubble bubble-one" />
          <span className="moon-bubble bubble-two" />
          <span className="moon-bubble bubble-three" />
          <span className="moon-bubble bubble-four" />
          <span className="moon-bubble bubble-five" />
        </div>
        <div className="jellyfish-bob">
          <div className="jellyfish-motion">
            <JellyfishFigure />
          </div>
        </div>
      </div>
    </div>
  )
}
