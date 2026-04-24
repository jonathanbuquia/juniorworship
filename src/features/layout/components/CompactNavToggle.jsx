import { motion } from 'framer-motion'
import { POPOVER_TRANSITION } from '../../app/constants.js'

const MotionButton = motion.button

export default function CompactNavToggle({ onClick, open }) {
  return (
    <MotionButton
      animate={{ opacity: 1, scale: 1 }}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className="compact-nav-toggle"
      initial={{ opacity: 0, scale: 0.92 }}
      onClick={onClick}
      transition={POPOVER_TRANSITION}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
    >
      <span />
      <span />
      <span />
    </MotionButton>
  )
}
