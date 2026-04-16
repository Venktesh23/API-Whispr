# API Whispr

> AI-powered API documentation assistant. Transform complex OpenAPI specifications into clear, actionable insights using advanced AI technology.

Upload your API specs, chat with your API in plain English, generate code, create tests, and share comprehensive documentation—all powered by AI.

## Features

- **AI Chat Interface** - Ask questions about your API in natural language
- **Real-Time Streaming** - Semantic-aware response streaming with multiple chunking strategies
- **Multi-Format Upload** - OpenAPI specs (YAML/JSON), PDF, DOCX, or paste raw content
- **Smart Analysis** - Instant endpoint analysis with health scoring and metrics
- **Code Generation** - Generate ready-to-use code in Python, TypeScript, JavaScript, Go, and cURL
- **Test Generation** - Auto-generate test suites in Jest, Pytest, or Postman collections
- **Spec Comparison** - Side-by-side comparison to detect breaking changes and deprecations
- **Project History** - All your previous analyses saved and easily accessible
- **Secure & Private** - Row-Level Security (RLS) with Supabase authentication
- **Dark Theme Design** - Modern, minimalist UI optimized for all devices
- **Production Ready** - Full CI/CD pipeline, comprehensive testing, monitoring dashboard

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- OpenAI API key

### Quick Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/Venktesh23/API-Whispr.git
   cd API-Whispr
   npm install
   ```

2. **Configure Environment**
   
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   SUPABASE_SERVICE_KEY=your_service_key
   OPENAI_API_KEY=your_api_key
   ```

3. **Setup Database**
   
   - Go to Supabase dashboard → SQL Editor
   - Run the schema from `supabase/schema.sql`

4. **Run Locally**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion
- **AI**: OpenAI API (GPT-4, GPT-3.5)
- **Backend**: Supabase PostgreSQL, Auth, pgvector, RLS
- **File Processing**: js-yaml, pdf-parse, mammoth, swagger-parser
- **Testing**: Jest, @testing-library/react
- **CI/CD**: GitHub Actions, Vercel
- **Streaming**: Server-Sent Events (SSE), semantic chunking

## Recent Improvements (April 2026)

### Streaming & Chunking ✨
- **Real-time SSE Streaming** - Semantic-aware response chunking
- **3 Chunking Strategies** - Semantic (best for readability), fixed-size, word-boundary
- **Configurable Delays** - Optimize for different network conditions
- **Token Estimation** - Better rate limiting and cost tracking

See `lib/streaming.js` for implementation details.

### Security & RLS 🔒
- **Row-Level Security (RLS)** - Database-level user data isolation
- **Ownership Validation** - All operations verify user ownership
- **Improved Error Handling** - Better security messages
- **DELETE Operations** - Clear chat history with RLS checks

See `pages/api/chat-rls.js` and `IMPLEMENTATION_GUIDE.md` for details.

### CI/CD Pipeline 🚀
Complete GitHub Actions workflow including:
- **Quality Checks** - ESLint, TypeScript validation
- **Automated Testing** - Unit & integration tests with coverage
- **Security Scanning** - Trivy vulnerability scanning
- **Staging Deployment** - Auto-deploy to staging (develop branch)
- **Production Deployment** - Auto-deploy to production (main branch)
- **Notifications** - Slack alerts on deployment

See `.github/workflows/ci-cd.yml` and `GITHUB_ACTIONS_SETUP.md` for setup.

### Testing Infrastructure 🧪
- **68+ Test Cases** - Comprehensive coverage
- **Integration Tests** - Full API endpoint testing
- **Jest Configuration** - Next.js optimized setup
- **Coverage Reporting** - Codecov integration

Run tests with: `npm run test:ci`

### Documentation 📚
New guides created:
- `GITHUB_ACTIONS_SETUP.md` - CI/CD setup instructions
- `IMPLEMENTATION_GUIDE.md` - Technical implementation details
- `TODOS_COMPLETED.md` - Completion summary
- `QUICK_START.md` - Getting started guide

```
api-whispr/
├── app/                 # Next.js App Router pages
│   ├── page.jsx        # Home redirect
│   ├── login/          # Auth page
│   ├── upload/         # Upload specs
│   ├── chat/           # Chat interface
│   ├── analysis/       # Analysis results
│   └── history/        # Previous projects
├── components/         # Reusable React components
├── hooks/             # Custom React hooks
├── pages/api/         # API route handlers
├── supabase/          # Database schema
├── styles/            # Global CSS
└── utils/             # Helper functions
```

## Key Features Explained

### Upload & Analysis
Drop your API file or paste content directly. The app instantly analyzes endpoints, parameters, and generates a health score.

### AI Chat
Ask natural language questions: "What endpoints return user data?" or "Show me all POST endpoints"

### Code Generation
Get copy-paste ready code snippets in your preferred language with all parameters included.

### Workflow
1. Upload → 2. Analyze → 3. Chat → 4. Generate Code → 5. Generate Tests → 6. Compare Specs → 7. Share

## Database Schema

- **api_specs**: Uploaded API specification documents
- **chat_history**: User conversations with their APIs
- **analysis_reports**: Generated analysis and insights
- **endpoint_tags**: Auto-categorized endpoints
- **spec_chunks**: Embeddings for semantic search

See `supabase/schema.sql` for full schema details.

## Contributing

Contributions welcome! Please fork the repo and submit a pull request.

## License

MIT License - see LICENSE file for details

## Author

[Venktesh23](https://github.com/Venktesh23)

---

Made with care for developers who love working with APIs`

## Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Usage

1. **Authentication**: Sign up or log in using email/password or Google OAuth
2. **Upload Specifications**: Upload API documentation in YAML, JSON, PDF, or DOCX format
3. **Interactive Chat**: Ask natural language questions about your API:
   - "How do I authenticate with this API?"
   - "What are all the available endpoints?"
   - "Show me examples for the user creation endpoint"
   - "What are the required parameters?"
4. **View Analysis**: See API health scores, warnings, and visual summaries
5. **Code Examples**: View and copy generated code snippets in multiple languages
6. **History**: Access previous conversations from your profile or chat history
7. **Export**: Download analysis and chat logs in PDF format

## Supported File Formats

- **OpenAPI Specifications**: YAML (.yaml, .yml), JSON (.json)
  - OpenAPI 3.0.x specifications
  - Swagger 2.0 specifications
- **Documentation Files**: PDF (.pdf), DOCX (.docx)
  - Text-based API documentation
  - Note: OCR not supported for image-based PDFs

## Screenshots

*Screenshots coming soon - visit [api-whispr.vercel.app](https://api-whispr.vercel.app) to see the live demo*

## Configuration

The application uses environment variables for configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xyzabc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIs...` |
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-proj-...` |

Ensure all required variables are set before running the application.

### Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for server-side operations
- `OPENAI_API_KEY`: OpenAI API key for AI features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 