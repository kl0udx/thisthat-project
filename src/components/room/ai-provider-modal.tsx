'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExternalLink, Sparkles, ArrowLeft, Check, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'
import { cn } from '@/lib/utils'

interface Provider {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  apiKeyPlaceholder: string
  apiKeyPattern?: string
  apiKeyHelp?: string
  color: string
  apiKeyUrl: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'ChatGPT',
    icon: (
      <img src="/logos/openai.png" alt="OpenAI Logo" className="w-8 h-8 object-contain" />
    ),
    description: 'OpenAI\'s ChatGPT model for natural language processing and generation.',
    apiKeyPlaceholder: 'sk-...',
    apiKeyPattern: '^sk-[A-Za-z0-9-_]{20,}$',
    apiKeyHelp: 'Your OpenAI API key should start with "sk-" followed by letters, numbers, hyphens, and underscores.',
    color: '',
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    name: 'Claude',
    icon: (
      <img src="/logos/claude.png" alt="Claude Logo" className="w-8 h-8 object-contain" />
    ),
    description: 'Anthropic\'s Claude model for advanced reasoning and analysis.',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyPattern: '^sk-ant-[A-Za-z0-9-_]{40,}$',
    apiKeyHelp: 'Your Anthropic API key should start with "sk-ant-" followed by letters, numbers, hyphens, and underscores.',
    color: '',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys'
  },
  {
    id: 'google',
    name: 'Gemini',
    icon: (
      <img src="/logos/gemini.png" alt="Gemini Logo" className="w-8 h-8 object-contain" />
    ),
    description: 'Google\'s Gemini model for multimodal understanding and generation.',
    apiKeyPlaceholder: 'AIza...',
    apiKeyPattern: '^AIza[A-Za-z0-9-_]{35,}$',
    apiKeyHelp: 'Your Google AI API key should start with "AIza" followed by letters and numbers.',
    color: '',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey'
  }
]

interface AIProviderModalProps {
  isOpen: boolean
  onClose: () => void
  onProviderAdded: (provider: string, apiKey: string) => void
  existingProviders: Set<string>
}

export function AIProviderModal({ 
  isOpen, 
  onClose, 
  onProviderAdded, 
  existingProviders 
}: AIProviderModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    setApiKey('')
    setError('')
  }

  const handleBack = () => {
    setSelectedProvider(null)
    setApiKey('')
    setError('')
  }

  const handleAddProvider = async () => {
    if (!selectedProvider || !apiKey.trim()) return

    // Validate format
    if (!selectedProvider.apiKeyPattern || !new RegExp(selectedProvider.apiKeyPattern).test(apiKey.trim())) {
      setError(`This doesn't look like a valid ${selectedProvider.name} API key`)
      return
    }

    setIsValidating(true)
    setError('')

    // Simulate validation (in real app, could do a test API call)
    setTimeout(() => {
      console.log('Modal calling onProviderAdded with:', selectedProvider.id, apiKey)
      onProviderAdded(selectedProvider.id, apiKey.trim())
      setIsValidating(false)
      handleBack()
      onClose()
    }, 800)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKey && selectedProvider) {
      handleAddProvider()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedProvider ? (
            <motion.div
              key="providers"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <DialogHeader className="mb-4">
                <DialogTitle>Add or Update AI Provider</DialogTitle>
                <DialogDescription>
                  Choose an AI to add or update. Your API key stays in your browser.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {PROVIDERS.map((provider) => {
                  const isActive = existingProviders.has(provider.id)
                  return (
                    <Card 
                      key={provider.id}
                      className={cn(
                        "cursor-pointer transition-all relative",
                        isActive 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                          : 'hover:shadow-md hover:scale-[1.02]'
                      )}
                      onClick={() => !isActive && handleProviderSelect(provider)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isActive ? 'bg-green-100 dark:bg-green-900/50' : `bg-gradient-to-br ${provider.color} bg-opacity-10`
                            )}>
                              {provider.icon}
                            </div>
                            <div>
                              <CardTitle className="text-base">{provider.name}</CardTitle>
                              <CardDescription className="text-sm mt-1">
                                {provider.description}
                              </CardDescription>
                            </div>
                          </div>
                          {/* X button for active providers */}
                          {isActive && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                              onClick={(e) => {
                                e.stopPropagation()
                                localStorage.removeItem(`api_key_${provider.id}`)
                                if (typeof window !== 'undefined' && window.toast) {
                                  window.toast.success(`${provider.name} disconnected`)
                                }
                                // Optionally, trigger a state update or callback here
                                window.location.reload()
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mb-4 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              <div className={`flex items-center gap-3 p-4 rounded-lg bg-gradient-to-br ${selectedProvider.color} bg-opacity-10 mb-6`}>
                <span className="text-4xl">{selectedProvider.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{selectedProvider.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProvider.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-lg">1️⃣</span>
                    Get your API key
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedProvider.apiKeyHelp}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedProvider.apiKeyUrl, '_blank')}
                    className="w-full sm:w-auto"
                  >
                    Open {selectedProvider.name} API Keys
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="text-lg">2️⃣</span>
                    Paste your API key
                  </h4>
                  <Label htmlFor="apiKey" className="sr-only">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={selectedProvider.apiKeyPlaceholder}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value)
                        setError('')
                      }}
                      onKeyPress={handleKeyPress}
                      className={`pr-10 font-mono ${error ? 'border-red-500' : ''}`}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 mt-2">{error}</p>
                  )}
                </div>

                <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Privacy First:</strong> Your API key is stored only in your browser and never sent to our servers.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleAddProvider}
                  disabled={!apiKey.trim() || isValidating}
                  className="w-full"
                  size="lg"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {existingProviders.has(selectedProvider.id) ? 'Update' : 'Add'} {selectedProvider.name}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
} 