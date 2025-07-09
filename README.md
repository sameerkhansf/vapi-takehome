# Voice AI Assistant

A Next.js application that provides real-time voice interaction using Google Cloud's Speech-to-Text, Vertex AI, and Text-to-Speech services.

## Features

- 🎤 Real-time voice recording
- 🗣️ Speech-to-Text transcription
- 🤖 AI-powered responses using Google Vertex AI
- 🔊 Text-to-Speech synthesis
- 🎨 Beautiful, responsive UI with dark mode support
- ⚡ Real-time status updates and progress indicators

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI Services**: Google Cloud Speech-to-Text, Vertex AI (Gemini), Text-to-Speech
- **Deployment**: Vercel

## Prerequisites

Before deploying, you need:

1. **Google Cloud Project** with the following APIs enabled:

   - Speech-to-Text API
   - Text-to-Speech API
   - Vertex AI API

2. **Service Account** with appropriate permissions:

   - Speech-to-Text User
   - Text-to-Speech User
   - Vertex AI User

3. **Vercel Account** for deployment

## Local Development

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd vapi-nextjs-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:

   ```env
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Deployment to Vercel

### Step 1: Prepare Google Cloud Credentials

1. **Create a service account key**:

   - Go to Google Cloud Console → IAM & Admin → Service Accounts
   - Create a new service account or select existing one
   - Create a new key (JSON format)
   - Download the JSON file

2. **Enable required APIs**:
   ```bash
   gcloud services enable speech.googleapis.com
   gcloud services enable texttospeech.googleapis.com
   gcloud services enable aiplatform.googleapis.com
   ```

### Step 2: Deploy to Vercel

1. **Install Vercel CLI** (optional):

   ```bash
   npm i -g vercel
   ```

2. **Deploy using Vercel Dashboard** (Recommended):

   - Push your code to GitHub/GitLab/Bitbucket
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Configure the following settings:

3. **Set Environment Variables in Vercel**:

   - Go to your project settings in Vercel
   - Navigate to "Environment Variables"
   - Add the following variables:
     ```
     GOOGLE_CLOUD_PROJECT_ID=your-project-id
     GOOGLE_CLOUD_LOCATION=us-central1
     GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
     ```

   **Important**: For `GOOGLE_APPLICATION_CREDENTIALS`, paste the entire content of your service account JSON file as a single line.

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

### Step 3: Verify Deployment

1. **Check the deployment logs** for any errors
2. **Test the application** by visiting your Vercel URL
3. **Check the function logs** in Vercel dashboard if there are issues

## Environment Variables

| Variable                         | Description                                | Required |
| -------------------------------- | ------------------------------------------ | -------- |
| `GOOGLE_CLOUD_PROJECT_ID`        | Your Google Cloud Project ID               | Yes      |
| `GOOGLE_CLOUD_LOCATION`          | Google Cloud region (default: us-central1) | No       |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account JSON credentials           | Yes      |

## Troubleshooting

### Common Issues

1. **"Function timeout" errors**:

   - The API route is configured for 60 seconds max duration
   - Check if your audio files are too large
   - Ensure Google Cloud APIs are responding quickly

2. **"Authentication failed" errors**:

   - Verify your service account has the correct permissions
   - Check that the `GOOGLE_APPLICATION_CREDENTIALS` is properly formatted
   - Ensure the APIs are enabled in your Google Cloud project

3. **"Module not found" errors**:
   - The webpack configuration handles Google Cloud packages
   - Ensure all dependencies are installed
   - Check that the `next.config.js` is properly configured

### Debugging

1. **Check Vercel Function Logs**:

   - Go to your Vercel dashboard
   - Navigate to Functions tab
   - Check the logs for `/api/voice`

2. **Test Locally First**:

   - Ensure everything works locally before deploying
   - Use the same environment variables locally

3. **Monitor Google Cloud**:
   - Check Google Cloud Console for API usage
   - Monitor quotas and billing

## Project Structure

```
vapi-nextjs-app/
├── app/
│   ├── api/voice/route.ts    # Voice processing API
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   └── ui/
│       ├── ai-voice-input.tsx    # Voice input component
│       ├── aurora-background.tsx # Background component
│       └── aurora-background-demo.tsx
├── lib/
│   ├── error-handler.ts      # Error handling utilities
│   ├── speech-to-text.ts     # Speech-to-Text service
│   ├── text-to-speech.ts     # Text-to-Speech service
│   ├── utils.ts              # Utility functions
│   └── vertex-ai.ts          # Vertex AI service
├── next.config.js            # Next.js configuration
├── vercel.json               # Vercel configuration
└── package.json              # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the Vercel and Google Cloud documentation
3. Open an issue in the repository
