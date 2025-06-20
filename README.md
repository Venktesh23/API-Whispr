# API Whisper

AI-powered OpenAPI specification analyzer and documentation generator. Upload your API specifications and interact with them using natural language queries.

## Features

- **Authentication**: Secure user authentication with Supabase Auth (email/password and Google OAuth)
- **File Upload**: Support for YAML, JSON, and PDF file formats
- **AI Chat Interface**: Natural language interaction with API specifications using OpenAI GPT
- **Code Generation**: Automatic generation of cURL, Python, and JavaScript examples
- **History Management**: Save and view past conversations
- **Visual Analytics**: API health scoring and endpoint visualization
- **Flowchart Generation**: AI-powered Mermaid diagram generation
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React 18
- **Styling**: Tailwind CSS with custom dark theme
- **Animation**: Framer Motion
- **AI/ML**: OpenAI GPT-3.5/GPT-4
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **File Processing**: swagger-parser, js-yaml, pdf-parse
- **Visualization**: Recharts, Mermaid
- **Deployment**: Vercel

## Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Supabase account
- OpenAI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/api-whisper.git
   cd api-whisper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Database Setup**
   
   Set up your Supabase database by running the SQL commands in `supabase/schema.sql`:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Execute the schema file to create necessary tables

5. **Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   
   Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Usage

1. **Authentication**: Sign up or log in using email/password or Google OAuth
2. **Upload Specifications**: Upload API documentation in YAML, JSON, or PDF format
3. **Interactive Chat**: Ask questions about your API such as:
   - "How do I authenticate with this API?"
   - "What are all the available endpoints?"
   - "Show me examples for the user creation endpoint"
4. **Code Examples**: View generated code snippets in multiple programming languages
5. **History**: Access previous conversations from your profile page
6. **Analysis**: View API health scores and visual summaries

## File Support

- **YAML/YML**: OpenAPI 3.0 specifications
- **JSON**: OpenAPI specifications and general API documentation
- **PDF**: Text-based API documentation (OCR not supported)

## Configuration

The application uses environment variables for configuration. Ensure all required variables are set before running the application.

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