'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface MediaItem {
  type: 'image' | 'video'
  src: string
  alt?: string
  poster?: string
}

interface MediaLightboxProps {
  media: MediaItem[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function MediaLightbox({ 
  media, 
  currentIndex, 
  isOpen, 
  onClose, 
  onNavigate 
}: MediaLightboxProps) {
  const [scale, setScale] = useState(1)
  const [showOriginalSize, setShowOriginalSize] = useState(false)
  const currentMedia = media[currentIndex]

  // Reset scale when media changes
  useEffect(() => {
    setScale(1)
    setShowOriginalSize(false)
  }, [currentIndex])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (currentIndex > 0) onNavigate(currentIndex - 1)
          break
        case 'ArrowRight':
          if (currentIndex < media.length - 1) onNavigate(currentIndex + 1)
          break
        case '0':
          // Reset to fit screen
          setScale(1)
          setShowOriginalSize(false)
          break
        case '1':
          // Show original size
          setShowOriginalSize(true)
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, currentIndex, media.length, onClose, onNavigate])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 3))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5))
  }

  const toggleOriginalSize = () => {
    setShowOriginalSize(!showOriginalSize)
    setScale(1)
  }

  if (!currentMedia) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 z-50 backdrop-blur-sm"
          />

          {/* Lightbox Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Controls Bar - Top */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                {/* Media Counter */}
                {media.length > 1 && (
                  <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {media.length}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Zoom Controls - Desktop only */}
                <div className="hidden sm:flex items-center space-x-2">
                  <button
                    onClick={handleZoomOut}
                    className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={20} />
                  </button>
                  
                  <button
                    onClick={handleZoomIn}
                    className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={20} />
                  </button>

                  <button
                    onClick={toggleOriginalSize}
                    className={`bg-black/50 text-white px-3 py-2 rounded-full hover:bg-black/70 transition-colors text-sm ${
                      showOriginalSize ? 'bg-white text-black' : ''
                    }`}
                    title="Toggle Original Size"
                  >
                    {showOriginalSize ? 'Fit' : '1:1'}
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  title="Close (Esc)"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Navigation Arrows - Desktop */}
            {media.length > 1 && (
              <>
                <button
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
                >
                  ←
                </button>
                
                <button
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={currentIndex === media.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
                >
                  →
                </button>
              </>
            )}

            {/* Media Content */}
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              {currentMedia.type === 'image' ? (
                <motion.img
                  key={`image-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={currentMedia.src}
                  alt={currentMedia.alt || 'Kelly Yu Wenwen'}
                  style={{
                    transform: `scale(${scale})`,
                    maxWidth: showOriginalSize ? 'none' : '90vw',
                    maxHeight: showOriginalSize ? 'none' : '80vh',
                    width: showOriginalSize ? 'auto' : undefined,
                    height: showOriginalSize ? 'auto' : undefined,
                  }}
                  className="object-contain transition-transform duration-200 cursor-zoom-in"
                  onClick={handleZoomIn}
                />
              ) : (
                <motion.video
                  key={`video-${currentIndex}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={currentMedia.src}
                  poster={currentMedia.poster}
                  controls
                  autoPlay
                  style={{
                    transform: `scale(${scale})`,
                    maxWidth: showOriginalSize ? 'none' : '90vw',
                    maxHeight: showOriginalSize ? 'none' : '80vh',
                  }}
                  className="object-contain transition-transform duration-200"
                />
              )}
            </div>

            {/* Mobile Touch Indicators */}
            {media.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 sm:hidden">
                {media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => onNavigate(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Mobile Instructions */}
            <div className="absolute bottom-4 left-4 right-4 text-center text-white/70 text-xs sm:hidden">
              Tap image to zoom • Swipe to navigate • Tap outside to close
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}