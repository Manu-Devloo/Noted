# Noted

A modern, AI-powered note-taking app built with React, Vite, and Netlify Functions. Noted lets you create, edit, categorize, and summarize notes, with optional image and AI assistance via OpenAI. User authentication and data storage are handled securely using JWT and Netlify Blobs.

## Features
- User authentication (JWT, admin and regular users)
- Create, edit, and delete notes
- Rich note content: title, summary, content, categories, images
- AI-powered note summarization and image context (OpenAI integration)
- Category management
- Search and filter notes
- Responsive, modern UI (Tailwind CSS)
- Serverless backend (Netlify Functions)

## Tech Stack
- React + Vite (frontend)
- Netlify Functions (backend/serverless)
- Netlify Blobs (data storage)
- OpenAI API (AI features)
- JWT (authentication)
- Tailwind CSS (styling)

## Getting Started

### 1. Clone the repository
```powershell
git clone https://github.com/your-username/Noted.git
cd Noted
```

### 2. Install dependencies
```powershell
yarn install
```

### 3. Set up environment variables
Create a `.env` file in the project root with the following (see `.env` example):
```
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD_HASH=your_bcrypt_hash
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=your_openai_base_url
SITE_ID=your_netlify_site_id
NETLIFY_API_TOKEN=your_netlify_api_token
```
- You can generate a bcrypt hash for the admin password using an online tool or Node.js.
- The OpenAI API key and base URL are required for AI features.
- The Netlify API token and site ID are needed for blob storage.

### 4. Run locally
```powershell
yarn dev
```
- The app will be available at `http://localhost:5173` (or as shown in your terminal).
- Netlify Functions will run automatically via Vite's dev server proxy.

### 5. Deploy to Netlify
1. Push your code to GitHub (or your preferred git host).
2. Create a new site on [Netlify](https://app.netlify.com/) and link your repository.
3. In Netlify dashboard, add the same environment variables from your `.env` file to the site's Environment Variables settings.
4. Deploy the site. Netlify will build and host both the frontend and serverless functions.

## Usage
- Register a new user (admin token required for first user creation)
- Log in to create, edit, and manage notes
- Use the AI assistant for summaries or image context
- Filter and search notes by category or keyword

## Admin User
- The admin user is defined in your `.env` file.
- To create new users, you must provide the admin token.

## License
See [LICENSE](./LICENSE) for details.

---

*Built with ❤️ using React, Vite, Netlify, and OpenAI.*
