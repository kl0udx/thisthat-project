import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'

interface UseScreenRecordingProps {
  maxDuration?: number
  onRecordingComplete?: (blob: Blob, url: string) => void
}

export function useScreenRecording({ 
  maxDuration = 120, 
  onRecordingComplete 
}: UseScreenRecordingProps = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      })

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Handle data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Handle stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        
        if (onRecordingComplete) {
          onRecordingComplete(blob, url)
        }
      }

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        console.log('User stopped screen sharing via Chrome controls')
        stopRecording()
      }

      // Start recording
      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)
      console.log('Recording started successfully')

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration - 1) {
            console.log('Maximum recording time reached, stopping automatically')
            stopRecording()
            toast.error('Maximum recording time reached')
            return prev
          }
          return prev + 1
        })
      }, 1000)

      toast.success('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast.error('Failed to start recording')
    }
  }, [maxDuration, onRecordingComplete])

  const stopRecording = useCallback(() => {
    console.log('stopRecording called, current state:', isRecording)
    
    // Stop the media recorder if it exists
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      } catch (error) {
        console.error('Error stopping recording:', error)
      }
      mediaRecorderRef.current = null
    }
    
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Always update state, even if recorder was already stopped
    setIsRecording(false)
    setRecordingTime(0)
    
    if (isRecording) {
      toast.success('Recording stopped')
    }
  }, [isRecording])

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording
  }
} 