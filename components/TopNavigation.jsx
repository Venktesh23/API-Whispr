'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  History, 
  LogOut, 
  Settings, 
  Upload,
  MessageSquare,
  ChevronDown,
  Bot
} from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

export default function TopNavigation() {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showHistoryMenu, setShowHistoryMenu] = useState(false)
  const { user, signOut } = useSupabase()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const profileMenuItems = [
    {
      icon: User,
      label: 'Profile',
      action: () => router.push('/profile')
    },
    {
      icon: Upload,
      label: 'Upload New Spec',
      action: () => router.push('/upload')
    },
    {
      icon: Settings,
      label: 'Settings',
      action: () => console.log('Settings')
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      action: handleSignOut,
      danger: true
    }
  ]

  const historyItems = [
    { label: 'Recent Uploads', count: 3 },
    { label: 'Chat Sessions', count: 7 },
    { label: 'Saved Specs', count: 12 }
  ]

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-b border-gray-600/30"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push('/upload')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gray-500 rounded-lg blur-lg opacity-20 animate-pulse" />
              <div className="relative bg-gradient-to-br from-gray-600 to-gray-700 p-2 rounded-lg border border-gray-500/30">
                <Bot className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400">
              API Whispr
            </h1>
          </motion.div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* History Button */}
            <div className="relative">
              <motion.button
                onClick={() => {
                  if (showHistoryMenu) {
                    setShowHistoryMenu(false)
                  } else {
                    router.push('/history')
                  }
                }}
                className="relative p-3 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200 group"
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
              >
                <History className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />
                <div className="absolute inset-0 bg-gradient-to-br from-gray-600/0 to-gray-500/0 group-hover:from-gray-600/10 group-hover:to-gray-500/10 rounded-xl transition-all duration-200" />
              </motion.button>

              <AnimatePresence>
                {showHistoryMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-2xl"
                  >
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-200 mb-3">Recent Activity</h3>
                      <div className="space-y-3">
                        {historyItems.map((item, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-700/40 transition-all duration-200 cursor-pointer"
                            whileHover={{ x: 4 }}
                            onClick={() => {
                              router.push('/history')
                              setShowHistoryMenu(false)
                            }}
                          >
                            <span className="text-gray-300 text-sm">{item.label}</span>
                            <span className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded-full">
                              {item.count}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      <motion.button
                        onClick={() => {
                          router.push('/history')
                          setShowHistoryMenu(false)
                        }}
                        className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white text-sm rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        View All History
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Button */}
            <div className="relative">
              <motion.button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-2 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-xl border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200 group"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center border border-gray-500/30 group-hover:border-gray-400/50 transition-all duration-200">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                <div className="absolute inset-0 bg-gradient-to-br from-gray-600/0 to-gray-500/0 group-hover:from-gray-600/10 group-hover:to-gray-500/10 rounded-xl transition-all duration-200" />
              </motion.button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-2xl"
                  >
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
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showProfileMenu || showHistoryMenu) && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => {
            setShowProfileMenu(false)
            setShowHistoryMenu(false)
          }}
        />
      )}
    </motion.nav>
  )
} 