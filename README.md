# 🌟 API Whisper - From Schema to Clarity

AI-powered OpenAPI specification analyzer and documentation generator. Upload your API specs and chat with them using natural language.

## ✨ Features

- 🔐 **Authentication**: Supabase Auth with email/password and Google OAuth
- 📁 **File Upload**: Support for `.yaml`, `.yml`, `.json`, and `.pdf` files
- 🤖 **AI Chat**: Natural language interaction with your API specs using GPT
- 💻 **Code Generation**: Automatic cURL, Python, and JavaScript examples
- 📚 **History**: Save and view past conversations
- 🎨 **Dark UI**: Beautiful neon-accented dark theme
- 📱 **Responsive**: Works on desktop and mobile

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router) + React
- **Styling**: Tailwind CSS + Custom neon theme
- **Animations**: Framer Motion
- **AI**: OpenAI GPT-3.5/GPT-4
- **Auth/DB**: Supabase (PostgreSQL + Auth + Storage)
- **File Parsing**: swagger-parser, js-yaml, pdf-parse
- **Hosting**: Vercel + Supabase

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd api-whisper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and Supabase credentials.

4. **Set up Supabase**
   Follow the instructions in `supabase/setup.md`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

1. **Sign In**: Create an account or sign in with Google
2. **Upload**: Upload your OpenAPI spec (`.yaml`, `.json`) or API documentation (`.pdf`)
3. **Chat**: Ask questions like:
   - "How do I create a user?"
   - "What endpoints require authentication?"
   - "Show me all DELETE endpoints"
4. **Code**: Get working code examples in cURL, Python, and JavaScript
5. **History**: View your past conversations in the profile page

## 🌈 UI Theme

The app features a beautiful dark theme with neon accents:
- **Background**: Deep blacks (#0B0B0B, #1E1E1E)
- **Neon Colors**: Green (#39FF14), Cyan (#00FFFF), Purple (#B26EFF)
- **Typography**: Inter for UI, Monaco for code
- **Animations**: Smooth transitions and hover effects

## 📁 Project Structure 