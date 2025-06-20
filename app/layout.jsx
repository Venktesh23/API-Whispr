import '../styles/globals.css'
import { ChatProvider } from '../hooks/useChatContext'
import ConditionalFloatingComponents from '../components/ConditionalFloatingComponents'

export const metadata = {
  title: 'API Whispr - From Schema to Clarity',
  description: 'AI-powered OpenAPI spec analyzer and documentation generator',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white min-h-screen">
        <ChatProvider>
          {children}
          <ConditionalFloatingComponents />
        </ChatProvider>
      </body>
    </html>
  )
} 