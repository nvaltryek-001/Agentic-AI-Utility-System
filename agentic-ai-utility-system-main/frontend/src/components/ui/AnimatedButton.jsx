import { motion } from 'framer-motion';

export default function AnimatedButton({ 
  children, 
  variant = 'primary',
  loading = false,
  onClick,
  className = '',
  disabled = false,
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${variants[variant]} ${className} ripple-container`}
    >
      {loading ? (
        <span className="spinner w-5 h-5 border-2" />
      ) : (
        children
      )}
    </motion.button>
  );
}
