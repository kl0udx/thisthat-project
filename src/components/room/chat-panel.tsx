'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Send, Minimize2, Maximize2, Sparkles, Search, Code, Loader2, MessageSquare, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { parseMessage, getAvailableCommands, type ParsedCommand } from '@/lib/command-parser'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { P2PConnection } from '@/lib/webrtc'
import { sendMessage, createAIRequest, createAIResponse } from '@/lib/supabase-hybrid'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  type: 'user' | 'ai' | 'system' | 'search' | 'command'
  user: string
  content: string
  timestamp: number
  provider?: string
  requestId?: string
  isLoading?: boolean
  command?: string
}

interface ChatPanelProps {
  roomCode: string
  userId: string
  nickname: string
  messages: Message[]
  connection: P2PConnection | null
  broadcast: (data: any) => void
  sendTo: (peerId: string, data: any) => void
  providers: Map<string, { userId: string; nickname: string; type: string }>
  localProviders: Set<string>
  onCanvasAdd?: (data: any) => void
  selectedObjects?: Array<{
    id: string
    type: string
    content?: string
    prompt?: string
    src?: string
    provider?: string
  }>
}

function detectProvider(input: string): string | undefined {
  if (input.startsWith('@claude')) return 'anthropic';
  if (input.startsWith('@ai') || input.startsWith('@chatgpt')) return 'openai';
  if (input.startsWith('@gemini')) return 'google';
  return undefined;
}

// Utility to get API key for a provider
function getApiKey(provider: string): string | null {
  return localStorage.getItem(`api_key_${provider}`)
}

export function ChatPanel({
  roomCode,
  userId,
  nickname,
  messages,
  connection,
  broadcast,
  sendTo,
  providers,
  localProviders,
  onCanvasAdd,
  selectedObjects
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Map<string, any>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Debug logs
  console.log('ChatPanel rendering, localProviders:', localProviders)
  console.log('Input:', input)
  console.log('Providers available:', providers)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const messagesContainer = document.querySelector('.messages-container')
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return
    
    const messageContent = input.trim()
    
    try {
      // Send message to Supabase
      const sentMessage = await sendMessage({
        room_code: roomCode,
        user_id: userId,
        nickname,
        content: messageContent,
        is_ai_request: messageContent.startsWith('@'),
        ai_provider: messageContent.startsWith('@') ? detectProvider(messageContent) : undefined
      })
      
      // Clear input immediately
      setInput('')
      
      // Handle AI commands AFTER message is sent
      if (messageContent.startsWith('@')) {
        const parsed = parseMessage(messageContent)
        if (parsed.type === 'ai') {
          // Call handleAICommand with the parsed message
          await handleAICommand(parsed, sentMessage.id)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleAICommand = async (parsed: any, messageId: string) => {
    console.log('🚀 handleAICommand ACTUALLY CALLED!', { parsed, messageId })
    console.log('Provider type:', parsed.command === 'ai' ? 'anthropic' : parsed.command)
    console.log('Local providers:', localProviders)
    console.log('Providers map:', providers)

    // Map command to provider type
    const commandMap: Record<string, string> = {
      'ai': 'anthropic',
      'claude': 'anthropic',
      'chatgpt': 'openai',
      'gpt': 'openai',
      'gemini': 'google'
    }

    const providerType = commandMap[parsed.command] || parsed.command
    console.log('Mapped provider type:', providerType)
    console.log('Do we have this provider locally?', localProviders.has(providerType))

    let enhancedPrompt = parsed.prompt
    let imageContent: any[] = []  // For Claude's vision API

    if (selectedObjects && selectedObjects.length > 0) {
      console.log('Including selected objects in context:', selectedObjects)
      
      // Create truncated context for display in chat messages
      const contextParts = selectedObjects.map((obj, index) => {
        if (obj.type === 'ai-response') {
          // Truncate the response content for display
          const content = obj.content || ''
          const truncatedContent = content.length > 150 
            ? content.substring(0, 150) + '... (truncated)'
            : content
          
          return `[Previous AI Response ${index + 1}]:\nPrompt: "${obj.prompt}"\nResponse: ${truncatedContent}\n`
        } else if (obj.type === 'image') {
          // For images, we'll handle them separately for Claude
          imageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',  // You might need to detect the actual type
              data: obj.src?.split(',')[1] || ''  // Remove the data:image/png;base64, prefix
            }
          })
          return `[Selected Image ${index + 1}]: Image selected for context\n`
        }
        return ''
      }).filter(Boolean)

      // For display in chat
      const displayPrompt = contextParts.length > 0
        ? `Context:\n\n${contextParts.join('\n---\n\n')}\n\n---\n\nUser request: ${parsed.prompt}`
        : parsed.prompt

      // But for the actual AI API call, still use the full context
      const fullContextParts = selectedObjects.map((obj, index) => {
        if (obj.type === 'ai-response') {
          return `[Previous AI Response ${index + 1}]:\nPrompt: "${obj.prompt}"\nResponse: ${obj.content || ''}\n`
        } else if (obj.type === 'image') {
          return `[Selected Image ${index + 1}]: User has selected an image\n`
        }
        return ''
      }).filter(Boolean)

      enhancedPrompt = fullContextParts.length > 0
        ? `Context:\n\n${fullContextParts.join('\n---\n\n')}\n\n---\n\nUser request: ${parsed.prompt}`
        : parsed.prompt
    }

    if (localProviders.has(providerType)) {
      console.log('✅ We have this provider locally! Provider type:', providerType)
      const apiKey = getApiKey(providerType)
      if (!apiKey) {
        console.error('No API key found!')
        return
      }

      // Create loading message
      const loadingMessageId = crypto.randomUUID()

      try {
        let responseText = ''
        console.log('About to switch on provider:', providerType)
        switch (providerType) {
          case 'anthropic': {
            console.log('Using Anthropic SDK...')
            const anthropic = new Anthropic({
              apiKey: apiKey,
              dangerouslyAllowBrowser: true
            })
            // Build message content
            const messageContent: any[] = []
            if (imageContent.length > 0) {
              messageContent.push(...imageContent)
            }
            messageContent.push({
              type: 'text',
              text: enhancedPrompt
            })
            console.log('Sending to Claude with', imageContent.length, 'images')
            const response = await anthropic.messages.create({
              model: 'claude-3-haiku-20240307',
              max_tokens: 2000,
              messages: [{
                role: 'user',
                content: messageContent
              }]
            })
            console.log('Claude response:', response)
            // Safely access the response text
            if (response.content && response.content[0]) {
              const block = response.content[0];
              if (typeof block === 'string') {
                responseText = block;
              } else if (typeof block === 'object' && 'text' in block && typeof block.text === 'string') {
                responseText = block.text;
              } else {
                responseText = String(block);
              }
            } else {
              throw new Error('Invalid response format from Claude')
            }
            break
          }
          case 'openai': {
            console.log('Using OpenAI SDK...')
            const openai = new OpenAI({ 
              apiKey: apiKey,
              dangerouslyAllowBrowser: true
            })
            const completion = await openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [{
                role: 'user',
                content: enhancedPrompt
              }]
            })
            responseText = completion.choices[0].message.content || ''
            break
          }
          case 'google': {
            console.log('Using Google API...')
            const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: enhancedPrompt
                  }]
                }]
              })
            })
            const geminiData = await geminiResponse.json()
            responseText = geminiData.candidates[0].content.parts[0].text
            break
          }
          default:
            throw new Error(`Unsupported provider: ${providerType}`)
        }
        console.log('API Response received:', responseText.substring(0, 100) + '...')
        console.log('About to add to canvas, onCanvasAdd exists?', !!onCanvasAdd)
        console.log('Canvas object data:', {
          type: 'ai-response',
          content: responseText,
          prompt: enhancedPrompt,
          provider: parsed.provider,
          executedBy: nickname,
          position: { x: 500, y: 300 }
        })

        if (!responseText) {
          console.error('No response text to display!')
          return
        }
        console.log('About to add to canvas, responseText:', responseText.substring(0, 100))

        console.log('Response from AI:', responseText)
        console.log('Enhanced prompt was:', enhancedPrompt)
        console.log('About to add to canvas with content:', responseText)
        if (onCanvasAdd) {
          const localResponseId = crypto.randomUUID()
          console.log('✅ Local AI processing - adding card with responseId:', localResponseId)
          onCanvasAdd({
            type: 'ai-response',
            content: responseText,  // This MUST be the AI's response only
            prompt: parsed.prompt,
            provider: providerType,
            executedBy: nickname,
            position: { x: 500, y: 300 },
            responseId: localResponseId // Generate local responseId for deduplication
          })
          
          // Don't broadcast - let Supabase handle distribution
          console.log('✅ AI response added locally, no broadcast needed')
        } else {
          console.error('❌ onCanvasAdd is not defined!')
        }

      } catch (error: any) {
        console.error('API Error:', error)
      }
    } else {
      console.log('❌ Provider not available locally')
      // NEW: Route through Supabase when we don't have the provider
      console.log(`Provider ${providerType} not available locally, routing request...`)
      setIsProcessing(true)
      try {
        await createAIRequest({
          room_code: roomCode,
          provider: providerType,
          prompt: enhancedPrompt,
          context: {},
          requested_by_user_id: userId,
          requested_by_nickname: nickname,
          status: 'pending'
        })
        toast(`Request sent! Waiting for someone with ${parsed.command}...`)
      } catch (error) {
        console.error('Failed to create AI request:', error)
        toast.error('Failed to send AI request')
        setIsProcessing(false)
      }
    }
  }

  const handleSearchCommand = async (parsed: any, messageId: string) => {
    const searchProvider = Array.from(providers.entries())
      .find(([_, info]) => info.type === 'perplexity')
    
    if (!searchProvider) {
      return
    }
    
    // Similar flow to AI command
    // ... implement search request flow
  }

  const handleHelpCommand = () => {
    const available = getAvailableCommands(providers)
    const aiProviders = Array.from(providers.values())
      .filter(p => ['openai', 'anthropic', 'google'].includes(p.type))
      .map(p => `${p.type} (${p.nickname})`)
    
    return
  }

  const handleAIRequest = async (data: any) => {
    // Someone is asking us to use our AI
    console.log('Received AI request:', data)
    
    // In real app, make actual API call here
    // For now, simulate
    setTimeout(() => {
      const response = {
        type: 'ai-response',
        requestId: data.requestId,
        result: `[Response from ${nickname}'s ${data.provider}]\n\nThis would be the actual API response to: "${data.prompt}"`,
        provider: data.provider,
        executedBy: nickname
      }
      
      // Send back to requester
      sendTo(data.requestedBy, response)
      
      // Also broadcast to everyone
      broadcast(response)
    }, 1500)
  }

  const handleAIResponse = (data: any) => {
    const pending = pendingRequests.get(data.requestId)
    if (pending) {
      // Add response to canvas
      onCanvasAdd?.({
        type: 'ai-response',
        content: data.result,
        provider: data.provider,
        executedBy: data.executedBy,
        prompt: pending.prompt,
        position: 'auto' // Canvas will figure out position
      })
    }
  }

  // Command suggestions while typing
  const getSuggestions = () => {
    if (!input.startsWith('@')) return []
    
    const commands = getAvailableCommands(providers)
    const typed = input.toLowerCase()
    
    return commands
      .filter(cmd => cmd.startsWith(typed))
      .slice(0, 5)
  }

  const suggestions = getSuggestions()

  // Real-time subscription for users WITH providers to process requests
  useEffect(() => {
    if (localProviders.size === 0) return
    const channel = supabase
      .channel(`ai-requests-handler-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_requests',
          filter: `room_code=eq.${roomCode}`
        },
        async (payload) => {
          const request = payload.new
          if (
            localProviders.has(request.provider) &&
            request.status === 'pending' &&
            request.requested_by_user_id !== userId
          ) {
            console.log(`Processing ${request.provider} request from ${request.requested_by_nickname}`)
            await supabase
              .from('ai_requests')
              .update({ status: 'processing' })
              .eq('id', request.id)
            const apiKey = getApiKey(request.provider)
            if (!apiKey) return
            try {
              let responseText = ''
              if (request.provider === 'anthropic') {
                const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
                const response = await anthropic.messages.create({
                  model: 'claude-3-haiku-20240307',
                  max_tokens: 1024,
                  messages: [{ role: 'user', content: request.prompt }]
                })
                responseText = response.content[0].type === 'text' ? response.content[0].text : ''
              } else if (request.provider === 'openai') {
                const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
                const completion = await openai.chat.completions.create({
                  model: 'gpt-4-turbo-preview',
                  messages: [{ role: 'user', content: request.prompt }]
                })
                responseText = completion.choices[0].message.content || ''
              } else if (request.provider === 'google') {
                const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                  },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: request.prompt }] }]
                  })
                })
                const geminiData = await geminiResponse.json()
                responseText = geminiData.candidates[0].content.parts[0].text
              }
              const aiResponse = await createAIResponse({
                room_code: roomCode,
                request_id: request.id,
                provider: request.provider,
                content: responseText,
                executed_by_user_id: userId,
                executed_by_nickname: nickname
              })
              
              console.log('✅ AI Response created in Supabase:', aiResponse.id)
              console.log('✅ Processor user ID:', userId)
              
              // Add to canvas ONLY for the processor
              if (onCanvasAdd && responseText) {
                console.log('✅ Processor adding AI response to canvas')
                console.log('✅ Response ID for deduplication:', aiResponse.id)
                onCanvasAdd({
                  type: 'ai-response',
                  content: responseText,
                  prompt: request.prompt,
                  provider: request.provider,
                  executedBy: nickname,
                  position: { x: 500, y: 300 },
                  responseId: aiResponse.id // Track response ID for deduplication
                })
                console.log('✅ Processor card added to canvas')
              } else {
                console.log('❌ Skipping processor card - onCanvasAdd:', !!onCanvasAdd, 'responseText:', !!responseText)
              }
              
              await supabase
                .from('ai_requests')
                .update({ status: 'completed' })
                .eq('id', request.id)
            } catch (error) {
              console.error('Failed to process AI request:', error)
              await supabase
                .from('ai_requests')
                .update({ status: 'failed' })
                .eq('id', request.id)
            }
          }
        }
      )
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [localProviders, roomCode, userId, nickname])

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "fixed bottom-6 left-6 z-50 transition-all",
          isMinimized ? "w-72" : "w-96"
        )}
      >
        <Card className={cn(
          "flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-2xl border max-h-[600px] overflow-hidden",
          isMinimized ? "h-14" : "h-[600px]"
        )}>
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between p-3 space-y-0 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-semibold">Chat</h3>
              {providers.size > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs">
                        {providers.size} AI{providers.size > 1 ? 's' : ''}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        {Array.from(providers.entries()).map(([type, info]) => (
                          <div key={type}>
                            {type}: {info.nickname}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
          </CardHeader>

          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* Add selection indicator */}
                {selectedObjects && selectedObjects.length > 0 && (
                  <div className="mx-4 mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {selectedObjects.length} {selectedObjects.length === 1 ? 'item' : 'items'} selected
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          • {selectedObjects.map(obj => obj.type).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages area - scrollable */}
                <div className="messages-container flex-1 min-h-0 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Try @help to see available commands</p>
                      </div>
                    ) : (
                      messages.map(message => (
                        <MessageBubble 
                          key={message.id || Math.random().toString()} 
                          message={message} 
                          isOwn={message.user === nickname} 
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Provider hints */}
                {providers.size > 0 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Try:</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {providers.has('openai') && <div>• @ai create a react component</div>}
                      {providers.has('perplexity') && <div>• @search latest AI news</div>}
                      {providers.has('anthropic') && <div>• @claude explain quantum computing</div>}
                    </div>
                  </div>
                )}

                {/* Input area - always at bottom */}
                <div className="p-4 border-t">
                  <div className="relative">
                    {/* Command suggestions */}
                    {suggestions.length > 0 && (
                      <Card className="absolute bottom-full left-0 right-0 mb-2 p-1">
                        {suggestions.map(cmd => (
                          <button
                            key={cmd}
                            className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm"
                            onClick={() => setInput(cmd + ' ')}
                          >
                            {cmd}
                          </button>
                        ))}
                      </Card>
                    )}
                    
                    <form onSubmit={(e) => { 
                      e.preventDefault()
                      console.log('Form submitted!')
                      handleSendMessage()
                    }} className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type @ for commands..."
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={!input.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </TooltipProvider>
  )
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  // Debug logging
  console.log('Rendering MessageBubble:', message)
  if (!message || !message.content) return null

  const getIcon = () => {
    switch (message.type) {
      case 'ai': return '🤖'
      case 'search': return '🔍'
      case 'system': return 'ℹ️'
      default: return null
    }
  }

  if (message.type === 'system') {
    return (
      <div className="flex items-center justify-center">
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs">
            {getIcon() || (typeof message.user === 'string' ? message.user.slice(0, 2).toUpperCase() : 'UN')}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-2",
        isOwn 
          ? "bg-primary text-primary-foreground" 
          : message.type === 'ai' 
            ? "bg-muted border" 
            : "bg-secondary"
      )}>
        {!isOwn && message.type !== 'user' && (
          <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
            <span className="font-medium">{message.user}</span>
            {message.provider && (
              <Badge variant="outline" className="text-xs scale-90">
                via {message.provider}
              </Badge>
            )}
          </div>
        )}
        
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="animate-pulse">Thinking...</span>
            </div>
          ) : (
            message.content
          )}
        </div>
        
        <div className={cn(
          "text-xs mt-1",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  )
} 