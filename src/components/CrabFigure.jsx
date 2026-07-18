export default function CrabFigure() {
  return (
    <div className="crab">
      <div className="crab-claw claw-left" />
      <div className="crab-claw claw-right" />
      <div className="crab-body">
        <div className="crab-eye-stalk stalk-left">
          <span className="crab-eye">
            <span className="crab-eye-spark" />
          </span>
        </div>
        <div className="crab-eye-stalk stalk-right">
          <span className="crab-eye">
            <span className="crab-eye-spark" />
          </span>
        </div>
        <div className="crab-blush crab-blush-left" />
        <div className="crab-blush crab-blush-right" />
        <div className="crab-mouth" />
      </div>
      <div className="crab-legs" aria-hidden="true">
        <span className="crab-leg leg-a" />
        <span className="crab-leg leg-b" />
        <span className="crab-leg leg-c" />
        <span className="crab-leg leg-d" />
        <span className="crab-leg leg-e" />
        <span className="crab-leg leg-f" />
      </div>
    </div>
  )
}
