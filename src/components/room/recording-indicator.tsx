import { motion, AnimatePresence } from 'framer-motion'

interface RecordingIndicatorProps {
  isRecording: boolean
  recordingTime: number
}

export function RecordingIndicator({ isRecording, recordingTime }: RecordingIndicatorProps) {
  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <div className="relative">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-white rounded-full animate-ping" />
            </div>
            <span className="font-semibold text-lg">Recording</span>
            <span className="font-mono text-lg">
              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </span>
            {recordingTime >= 90 && (
              <span className="text-sm opacity-80">
                (Max 2:00)
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 