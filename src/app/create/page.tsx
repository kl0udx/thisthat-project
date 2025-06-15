'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateRoomCode } from '@/lib/utils'

const AI_PROVIDERS = [
  {
    type: 'openai' as const,
    name: 'ChatGPT',
    model: 'gpt-4-turbo-preview',
    description: 'Powered by OpenAI\'s GPT-4'
  },
  {
    type: 'anthropic' as const,
    name: 'Claude',
    model: 'claude-3-opus-20240229',
    description: 'Powered by Anthropic\'s Claude'
  },
  {
    type: 'google' as const,
    name: 'Gemini',
    model: 'gemini-pro',
    description: 'Powered by Google\'s Gemini'
  }
]

export default function CreateRoom() {
  const router = useRouter()
  const [selectedProvider, setSelectedProvider] = useState<typeof AI_PROVIDERS[0] | null>(null)
  const [apiKey, setApiKey] = useState('')

  const handleCreateRoom = () => {
    if (!selectedProvider || !apiKey) return

    const roomCode = generateRoomCode()
    // TODO: Store room in Supabase
    router.push(`/room/${roomCode}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="w-full max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">Create a New Room</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AI_PROVIDERS.map((provider) => (
            <Card
              key={provider.type}
              className={`cursor-pointer transition-all ${
                selectedProvider?.type === provider.type
                  ? 'border-primary ring-2 ring-primary'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedProvider(provider)}
            >
              <CardHeader>
                <CardTitle>{provider.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedProvider && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={`Enter your ${selectedProvider.name} API key`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground italic">
                Your API key is stored locally in your browser and is never sent to our servers. 
                It is only used to make direct API calls to {selectedProvider.name}.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateRoom}
              disabled={!apiKey}
            >
              Create Room
            </Button>
          </div>
        )}
      </div>
    </main>
  )
} 