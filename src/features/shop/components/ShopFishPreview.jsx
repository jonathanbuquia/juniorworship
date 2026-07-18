import { motion } from 'framer-motion'
import CrabFigure from '../../../components/CrabFigure.jsx'
import JellyfishFigure from '../../../components/JellyfishFigure.jsx'

const MotionDiv = motion.div

export default function ShopFishPreview({ className = '', item, index = 0 }) {
  const fishScale = item.shopFishScale ?? 1.08
  const rootClassName = ['shop-card-preview', className].filter(Boolean).join(' ')
  const isJellyfish = item.creatureType === 'jellyfish'
  const isCrab = item.creatureType === 'crab'

  return (
    <div className={rootClassName}>
      <span className="shop-card-glow" style={{ '--shop-glow': item.accentColor }} />
      <span className="shop-card-bubble bubble-a" />
      <span className="shop-card-bubble bubble-b" />
      <span className="shop-card-bubble bubble-c" />
      <span className="shop-card-seaweed seaweed-a" />
      <span className="shop-card-seaweed seaweed-b" />
      <MotionDiv
        animate={{
          rotate: [-3, 2, -3],
          x: ['-10%', '8%', '-10%'],
          y: [0, -7, 0, 5, 0],
        }}
        className={`shop-fish-swim ${isJellyfish ? 'shop-jellyfish-swim' : ''} ${isCrab ? 'shop-crab-swim' : ''}`}
        transition={{
          duration: 4.8 + index * 0.55,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        {isCrab ? (
          <div
            className="shop-card-crab"
            style={{
              '--crab-facing': 1,
              '--crab-tilt': '-2deg',
              '--shop-crab-scale': fishScale,
            }}
          >
            <div className="crab-bob">
              <div className="crab-motion">
                <CrabFigure />
              </div>
            </div>
          </div>
        ) : isJellyfish ? (
          <div
            className="shop-card-jellyfish"
            style={{
              '--jellyfish-facing': 1,
              '--jellyfish-tilt': '-2deg',
              '--shop-jellyfish-scale': fishScale,
            }}
          >
            <div className="jellyfish-bob">
              <div className="jellyfish-motion">
                <JellyfishFigure />
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </MotionDiv>
    </div>
  )
}
