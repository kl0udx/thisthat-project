export interface ParsedCommand {
  type: 'ai' | 'search' | 'help' | 'chat'
  command?: string
  prompt?: string
  raw: string
}

export function parseMessage(message: string): ParsedCommand {
  const trimmed = message.trim()
  
  // Check for @ commands
  if (trimmed.startsWith('@')) {
    const parts = trimmed.split(' ')
    const command = parts[0].toLowerCase()
    const prompt = parts.slice(1).join(' ')
    
    switch (command) {
      case '@ai':
      case '@chatgpt':
      case '@claude':
      case '@gemini':
        return {
          type: 'ai',
          command: command.replace('@', ''),
          prompt,
          raw: trimmed
        }
        
      case '@search':
        return {
          type: 'search',
          command: 'search',
          prompt,
          raw: trimmed
        }
        
      case '@help':
        return {
          type: 'help',
          command: 'help',
          raw: trimmed
        }
        
      default:
        // Unknown @ command, treat as chat
        return {
          type: 'chat',
          raw: trimmed
        }
    }
  }
  
  // Regular chat message
  return {
    type: 'chat',
    raw: trimmed
  }
}

export function getAvailableCommands(providers: Map<string, any>): string[] {
  const commands = new Set(['@help'])
  
  // Add AI commands if available
  if (providers.has('openai')) {
    commands.add('@ai')
    commands.add('@chatgpt')
  }
  if (providers.has('anthropic')) {
    commands.add('@ai')
    commands.add('@claude')
  }
  if (providers.has('google')) {
    commands.add('@ai')
    commands.add('@gemini')
  }
  
  // Add search if available
  if (providers.has('perplexity')) commands.add('@search')
  
  return Array.from(commands)
} 