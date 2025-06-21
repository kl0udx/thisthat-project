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
  userId: string
  nickname: string
  connection: P2PConnection | null
  broadcast: (data: any) => void
  sendTo: (peerId: string, data: any) => void
  providers: Map<string, Set<string>>
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

export function ChatPanel({
  userId,
  nickname,
  connection,
  broadcast,
  sendTo,
  providers,
  localProviders,
  onCanvasAdd,
  selectedObjects
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Map<string, any>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Debug logs
  console.log('ChatPanel rendering, localProviders:', localProviders)
  console.log('Input:', input)
  console.log('Providers available:', providers)

  // Listen for P2P messages
  useEffect(() => {
    if (!connection) return

    const unsubscribe = connection.onMessage((data: any) => {
      switch (data.type) {
        case 'chat-message':
          setMessages(prev => [...prev, data.message])
          break

        case 'ai-request':
          // Someone is requesting AI from us
          if (providers.has(data.provider) && providers.get(data.provider)?.userId === userId) {
            handleAIRequest(data)
          }
          break

        case 'ai-response':
          // We got a response to our request
          handleAIResponse(data)
          break

        case 'provider-added':
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'system',
            user: 'System',
            content: `✨ ${data.nickname} added ${data.provider}! Use @${data.provider === 'openai' ? 'ai' : data.provider} to access.`,
            timestamp: Date.now()
          }])
          break
      }
    })

    return unsubscribe
  }, [connection, providers, userId])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    console.log('handleSend called! Input:', input)
    if (!input.trim()) {
      console.log('Input is empty, returning')
      return
    }

    console.log('=== SENDING MESSAGE ===')
    console.log('Input:', input)
    console.log('Starts with @?', input.startsWith('@'))

    // Parse the message
    const parsed = parseMessage(input)
    console.log('Parsed message:', parsed)

    // Add user message to chat
    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      user: nickname,
      content: input,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])

    // Handle commands
    if (parsed.type === 'ai') {
      console.log('Detected AI command!')
      console.log('Command:', parsed.command)
      console.log('Prompt:', parsed.prompt)
      console.log('About to call handleAICommand...')
      handleAICommand(parsed, userMessage.id)
      return // Important: return to prevent normal message handling
    }

    setInput('')
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

    if (localProviders.has(providerType)) {
      console.log('✅ We have this provider locally! Provider type:', providerType)
      const apiKey = localStorage.getItem(`api_key_${providerType}`)
      if (!apiKey) {
        console.error('No API key found!')
        return
      }

      // Add selected context to the prompt
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

        // Update the user message in chat to show truncated context
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: displayPrompt }
            : msg
        ))
      }

      // Create loading message
      const loadingMessageId = crypto.randomUUID()
      setMessages(prev => [...prev, {
        id: loadingMessageId,
        type: 'ai',
        user: providerType,
        content: 'Thinking...',
        timestamp: Date.now(),
        isLoading: true
      }])

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
              if (typeof response.content[0] === 'string') {
                responseText = response.content[0]
              } else if (response.content[0].text) {
                responseText = response.content[0].text
              } else if (response.content[0].type === 'text') {
                responseText = response.content[0].text || ''
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
          setMessages(prev => prev.filter(m => m.id !== loadingMessageId))
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'system',
            user: 'System',
            content: '❌ Received empty response from AI',
            timestamp: Date.now()
          }])
          return
        }
        console.log('About to add to canvas, responseText:', responseText.substring(0, 100))

        console.log('Response from AI:', responseText)
        console.log('Enhanced prompt was:', enhancedPrompt)
        console.log('About to add to canvas with content:', responseText)
        if (onCanvasAdd) {
          onCanvasAdd({
            type: 'ai-response',
            content: responseText,  // This MUST be the AI's response only
            prompt: parsed.prompt,
            provider: providerType,
            executedBy: nickname,
            position: { x: 500, y: 300 }
          })
        } else {
          console.error('onCanvasAdd is not defined!')
        }

        // Remove loading message
        setMessages(prev => prev.filter(m => m.id !== loadingMessageId))

        // Show success in chat
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'system',
          user: 'System',
          content: `✅ Response added to canvas`,
          timestamp: Date.now()
        }])

      } catch (error: any) {
        console.error('API Error:', error)

        // Remove loading message
        setMessages(prev => prev.filter(m => m.id !== loadingMessageId))

        // Show error
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'system',
          user: 'System',
          content: `❌ Error: ${error.message}`,
          timestamp: Date.now()
        }])
      }
    } else {
      console.log('❌ Provider not available locally')
      // Handle routing to other peers...
    }
  }

  const handleSearchCommand = async (parsed: any, messageId: string) => {
    const searchProvider = Array.from(providers.entries())
      .find(([_, info]) => info.type === 'perplexity')
    
    if (!searchProvider) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'system',
        user: 'System',
        content: '❌ No search provider available. Someone needs to add Perplexity!',
        timestamp: Date.now()
      }])
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
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'system',
      user: 'System',
      content: `📖 Available Commands:\n${available.join('\n')}\n\nActive AI Providers:\n${aiProviders.join('\n') || 'None - add one with the robot button!'}`,
      timestamp: Date.now()
    }])
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
    // Remove loading message and add response
    setMessages(prev => prev.filter(m => m.id !== data.requestId))
    
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
      
      // Show success message in chat
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'system',
        user: 'System',
        content: `✅ Response added to canvas (via ${data.executedBy}'s ${data.provider})`,
        timestamp: Date.now()
      }])
      
      setPendingRequests(prev => {
        const next = new Map(prev)
        next.delete(data.requestId)
        return next
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
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
                          key={message.id} 
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
                      handleSend()
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
            {getIcon() || message.user.slice(0, 2).toUpperCase()}
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