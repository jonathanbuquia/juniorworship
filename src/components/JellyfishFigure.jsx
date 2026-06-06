export default function JellyfishFigure() {
  return (
    <div className="jellyfish">
      <div className="jellyfish-bell">
        <div className="jellyfish-highlight" />
        <div className="jellyfish-eye jellyfish-eye-left">
          <span className="jellyfish-eye-spark" />
        </div>
        <div className="jellyfish-eye jellyfish-eye-right">
          <span className="jellyfish-eye-spark" />
        </div>
        <div className="jellyfish-mouth" />
        <div className="jellyfish-blush jellyfish-blush-left" />
        <div className="jellyfish-blush jellyfish-blush-right" />
      </div>
      <div className="jellyfish-frill" aria-hidden="true" />
      <div className="jellyfish-tentacles" aria-hidden="true">
        <span className="jellyfish-tentacle tentacle-a" />
        <span className="jellyfish-tentacle tentacle-b" />
        <span className="jellyfish-tentacle tentacle-c" />
        <span className="jellyfish-tentacle tentacle-d" />
        <span className="jellyfish-tentacle tentacle-e" />
      </div>
    </div>
  )
}
