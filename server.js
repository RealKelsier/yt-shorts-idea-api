const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for frontend requests

// Environment variable for YouTube API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API بنابراین

if (!YOUTUBE_API_KEY) {
  console.error('YOUTUBE_API_KEY is not set in environment variables');
  process.exit(1);
}

// Endpoint to generate ideas
app.post('/api/ideas', async (req, res) => {
  const { url } = req.body;

  // Validate URL
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Extract channel handle from URL (e.g., @MrBeast from https://www.youtube.com/@MrBeast)
  const match = url.match(/youtube\.com\/@([\w-]+)/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid YouTube channel URL' });
  }
  const channelHandle = match[1]; // e.g., "MrBeast"

  try {
    // Fetch channel details from YouTube Data API
    const youtubeResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=@${channelHandle}&key=${YOUTUBE_API_KEY}`
    );

    if (!youtubeResponse.data.items || youtubeResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channelData = youtubeResponse.data.items[0].snippet;
    const channelTitle = channelData.title; // e.g., "MrBeast"
    const channelDescription = channelData.description;

    // Fetch recent videos to get more context (optional)
    const videoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeResponse.data.items[0].id}&maxResults=5&order=date&key=${YOUTUBE_API_KEY}`
    );

    const recentVideos = videoResponse.data.items.map(item => item.snippet.title);

    // Generate ideas based on channel data
    // Placeholder logic; replace with AI model integration if needed
    const ideas = [
      {
        title: `Create a 60-second recap of ${channelTitle}'s most viral challenge!`,
        score: 8
      },
      {
        title: `React to ${recentVideos[0] || 'a recent video'} in a funny way!`,
        score: 7
      },
      {
        title: `Try a mini version of ${channelTitle}'s latest stunt at home!`,
        score: 6
      },
      {
        title: `Share a behind-the-scenes story inspired by ${channelTitle}'s content!`,
        score: 7
      },
      {
        title: `Make a parody of ${channelTitle}'s video style!`,
        score: 6
      }
    ];

    // Return the ideas
    res.json({ ideas });
  } catch (error) {
    console.error('Error generating ideas:', error.message);
    if (error.response) {
      // YouTube API error
      if (error.response.status === 403) {
        return res.status(403).json({ error: 'YouTube API quota exceeded or invalid API key' });
      }
      if (error.response.status === 404) {
        return res.status(404).json({ error: 'Channel not found' });
      }
    }
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('ShortsGenix Backend API is running');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

