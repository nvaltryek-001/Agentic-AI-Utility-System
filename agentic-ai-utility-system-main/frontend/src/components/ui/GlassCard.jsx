import { motion } from 'framer-motion';

export default function GlassCard({ 
  children, 
  className = '', 
  hover = true,
  onClick 
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`glass-card ${hover ? 'glass-card-hover' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
