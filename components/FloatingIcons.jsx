'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  LogOut,
  Upload,
  ChevronDown,
  History
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

export default function FloatingIcons() {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const { user, signOut } = useSupabase()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const profileMenuItems = [
    {
      icon: Upload,
      label: 'Upload New',
      action: () => router.push('/upload')
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      action: handleSignOut,
      danger: true
    }
  ]

  return (
    <>
      {/* Floating Icons Container */}
      <div className="fixed top-6 right-6 z-40 flex items-center gap-3">
        
        {/* History Button */}
        <motion.button
          onClick={() => router.push('/history')}
          className="w-12 h-12 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-600/30 rounded-full shadow-lg flex items-center justify-center group hover:border-gray-500/50 transition-all duration-200"
          whileHover={{ 
            scale: 1.1, 
            y: -2,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}
          whileTap={{ scale: 0.95 }}
          title="View History"
        >
          <History className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600/0 to-gray-500/0 group-hover:from-gray-600/10 group-hover:to-gray-500/10 rounded-full transition-all duration-200" />
        </motion.button>

        {/* Profile Menu */}
        <div className="relative">
          <motion.button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-12 h-12 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-gray-600/30 rounded-full shadow-lg flex items-center justify-center group hover:border-gray-500/50 transition-all duration-200"
            whileHover={{ 
              scale: 1.1, 
              y: -2,
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            title="Profile Menu"
          >
            <User className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-600/0 to-gray-500/0 group-hover:from-gray-600/10 group-hover:to-gray-500/10 rounded-full transition-all duration-200" />
          </motion.button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 w-48 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-2xl"
              >
                {/* User Info */}
                <div className="p-4 border-b border-gray-600/20">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  {profileMenuItems.map((item, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        item.action()
                        setShowProfileMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                        item.danger 
                          ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300' 
                          : 'hover:bg-gray-700/40 text-gray-300 hover:text-white'
                      }`}
                      whileHover={{ x: 4 }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showProfileMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </>
  )
} 