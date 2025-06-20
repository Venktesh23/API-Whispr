'use client'

import { motion } from 'framer-motion'

export default function NeonButton({ 
  children, 
  onClick, 
  variant = 'green', 
  size = 'md',
  className = '',
  disabled = false,
  ...props 
}) {
  const variants = {
    green: 'bg-neon-green text-black shadow-neon-green hover:shadow-neon-green-lg',
    cyan: 'bg-neon-cyan text-black shadow-neon-cyan hover:shadow-neon-cyan',
    purple: 'bg-neon-purple text-white shadow-neon-purple hover:shadow-neon-purple',
    outline: 'border-2 border-neon-green text-neon-green hover:bg-neon-green hover:text-black'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        rounded-xl font-bold transition-all duration-300 
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  )
} 