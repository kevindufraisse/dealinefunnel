# Deadline Funnel

A countdown timer application that helps create urgency in marketing campaigns. This application allows you to:

- Create evergreen and fixed-date countdown timers
- Customize the appearance of your timers
- Easily embed timers on any website
- Track visitor interactions

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Create a new campaign in the dashboard
2. Configure your timer settings
3. Copy the embed code
4. Paste the code on your website

## Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Technologies Used

- React
- TypeScript
- Vite
- Supabase
- Netlify Functions 