# THISTHAT.FUN 🚀

**Vibe and Enjoy This. Build and Create That. Together.**

The first AI collaboration tool that allows you to share resources because vibes are better together!

🌐 **Live Demo**: [thisthat.fun](https://thisthat.fun)

## 🏆 Bolt.new Hackathon Submission

### Challenges We're Tackling:
- **🚀 Startup Challenge** - Using Supabase to build a scalable real-time collaboration platform
- **🌐 Custom Domain Challenge** - Deployed on IONOS domain: thisthat.fun

## 🎯 What is THISTHAT?

THISTHAT is a revolutionary multiplayer AI workspace where creativity meets collaboration. Unlike traditional AI tools where everyone needs their own API keys, THISTHAT lets one person add AI capabilities and everyone in the room benefits instantly.

### The Magic: Distributed AI Through WebRTC
- **One person adds ChatGPT** → Everyone can use it
- **Another adds Perplexity** → Everyone can search
- **Someone adds Claude** → Everyone gets analysis
- **API keys stay private** → P2P architecture ensures security

## ✨ Core Features

### 🤝 True Multiplayer AI
- Real-time collaboration with multiple users
- See each other's cursors and actions
- Chat naturally while building together
- Voice commands with ElevenLabs integration

### 🎨 Infinite Canvas (25,000 x 25,000px)
- Draw, sketch, and ideate freely
- Transform sketches into code with AI
- Drag and arrange AI responses spatially
- Visual thinking meets AI power

### 🧠 Distributed Intelligence
- **No central server** - Everything runs peer-to-peer
- **Privacy first** - API keys never leave your browser
- **Cost sharing** - Each person uses their own API credits
- **Resilient** - If someone leaves, only their tools go offline

### 🛠️ Build Together
- Generate React components from sketches
- Search for best practices while coding
- Get AI suggestions on improvements
- See the evolution of ideas visually

## 🚧 Roadmap

- [x] P2P implementation
- [x] Basic canvas with drawing
- [x] AI provider integration
- [x] Chat with @ commands
- [ ] More provider integrations (GitHub, Perplexity)
- [ ] Persistent rooms
- [ ] Mobile support
- [ ] Canvas collaboration features

## 🙏 Acknowledgments

- Built with [Bolt.new](https://bolt.new) for the Hackathon
- Powered by [Supabase](https://supabase.com) for real-time
- Domain by [IONOS](https://ionos.com)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for signaling)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/thisthat-project.git
cd thisthat-project

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Run the development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Real-time**: WebRTC, Supabase Realtime
- **AI Integration**: OpenAI, Anthropic, Google AI
- **Styling**: shadcn/ui, Framer Motion
- **Deployment**: Vercel

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- Website: [thisthat.fun](https://thisthat.fun)
- Twitter: [@thisthat_fun](https://twitter.com/thisthat_fun)
- Email: hello@thisthat.fun
