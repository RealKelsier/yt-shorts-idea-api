const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Environment variable for YouTube API key
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.error('YOUTUBE_API_KEY is not set in environment variables');
  process.exit(1);
}

// Helper function to determine the channel's niche based on description and video titles
const determineNiche = (description, videoTitles) => {
  const lowerDesc = description.toLowerCase();
  const lowerTitles = videoTitles.join(' ').toLowerCase();

  // Common niches and associated keywords
  const niches = {
    gaming: ['game', 'gaming', 'minecraft', 'fortnite', 'call of duty', 'gta', 'playthrough', 'streamer'],
    tech: ['tech', 'review', 'unboxing', 'gadget', 'smartphone', 'laptop', 'software', 'tutorial'],
    vlogging: ['vlog', 'daily', 'life', 'travel', 'adventure', 'day in the life', 'storytime'],
    education: ['education', 'tutorial', 'how to', 'learn', 'science', 'math', 'history', 'explained'],
    fitness: ['fitness', 'workout', 'exercise', 'health', 'diet', 'training', 'yoga', 'gym'],
    cooking: ['cooking', 'recipe', 'food', 'kitchen', 'bake', 'cook', 'meal', 'chef'],
    entertainment: ['challenge', 'prank', 'reaction', 'funny', 'comedy', 'skit', 'entertainment'],
    beauty: ['beauty', 'makeup', 'skincare', 'hair', 'fashion', 'style', 'tutorial'],
    music: ['music', 'song', 'cover', 'instrument', 'dj', 'performance', 'lyrics']
  };

  // Check which niche matches the most
  let detectedNiche = 'general';
  let maxMatches = 0;

  for (const [niche, keywords] of Object.entries(niches)) {
    let matches = 0;
    keywords.forEach(keyword => {
      if (lowerDesc.includes(keyword) || lowerTitles.includes(keyword)) {
        matches++;
      }
    });
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedNiche = niche;
    }
  }

  return detectedNiche;
};

// Simulate trending topics based on niche (since we can't fetch live trends)
const getTrendingTopics = (niche) => {
  const trendsByNiche = {
    gaming: ['new game release', 'speedrun challenge', 'multiplayer tips', 'game glitch', 'esports event'],
    tech: ['latest smartphone', 'AI tool demo', 'budget laptop', 'software update', 'tech hack'],
    vlogging: ['travel destination', 'morning routine', 'life hack', 'city tour', 'minimalist living'],
    education: ['study tip', 'exam hack', 'science fact', 'history mystery', 'math trick'],
    fitness: ['5-minute workout', 'home exercise', 'healthy snack', 'yoga pose', 'weight loss tip'],
    cooking: ['quick recipe', 'viral food hack', 'healthy meal', 'dessert idea', 'cooking challenge'],
    entertainment: ['viral challenge', 'funny reaction', 'prank idea', 'trending meme', 'comedy skit'],
    beauty: ['makeup trend', 'skincare routine', 'hair tutorial', 'fashion haul', 'beauty hack'],
    music: ['song cover', 'instrument tutorial', 'music challenge', 'new album reaction', 'karaoke'],
    general: ['trending challenge', 'life hack', 'fun fact', 'DIY project', 'quick tip']
  };

  return trendsByNiche[niche] || trendsByNiche['general'];
};

// Generate Shorts ideas based on niche and trends
const generateIdeas = (niche, trends, channelTitle, recentVideos) => {
  const ideasByNiche = {
    gaming: [
      `Showcase a 60-second ${trends[0]} on your channel!`,
      `Share a quick tip for ${recentVideos[0] || 'a popular game'}!`,
      `Do a mini ${trends[1]} in your next Short!`,
      `Highlight a funny moment from ${trends[2]}!`,
      `Challenge your viewers with a ${trends[3]}!`
    ],
    tech: [
      `Unbox the ${trends[0]} in 60 seconds!`,
      `Share a quick ${trends[1]} for your audience!`,
      `Review a ${trends[2]} under a minute!`,
      `Show a ${trends[3]} that saves time!`,
      `Compare two gadgets in a ${trends[4]} style!`
    ],
    vlogging: [
      `Vlog a quick trip to a ${trends[0]}!`,
      `Share your ${trends[1]} in 60 seconds!`,
      `Try a ${trends[2]} and document it!`,
      `Show a ${trends[3]} in your city!`,
      `Create a Short about ${trends[4]}!`
    ],
    education: [
      `Explain a ${trends[0]} in 60 seconds!`,
      `Share a quick ${trends[1]} for students!`,
      `Break down a ${trends[2]} for beginners!`,
      `Teach a ${trends[3]} in a Short!`,
      `Highlight a ${trends[4]} for your audience!`
    ],
    fitness: [
      `Demonstrate a ${trends[0]} for beginners!`,
      `Share a ${trends[1]} with no equipment!`,
      `Try a ${trends[2]} and show results!`,
      `Teach a quick ${trends[3]} for flexibility!`,
      `Create a ${trends[4]} challenge for viewers!`
    ],
    cooking: [
      `Make a ${trends[0]} in 60 seconds!`,
      `Share a ${trends[1]} for busy people!`,
      `Try a ${trends[2]} and rate it!`,
      `Show a ${trends[3]} for beginners!`,
      `Do a ${trends[4]} with your viewers!`
    ],
    entertainment: [
      `Try the ${trends[0]} with a twist!`,
      `React to a ${trends[1]} in 60 seconds!`,
      `Pull a ${trends[2]} on a friend!`,
      `Create a ${trends[3]} inspired Short!`,
      `Make a quick ${trends[4]} for laughs!`
    ],
    beauty: [
      `Show a ${trends[0]} tutorial in 60 seconds!`,
      `Share your ${trends[1]} for glowing skin!`,
      `Try a ${trends[2]} for a quick look!`,
      `Do a ${trends[3]} with affordable products!`,
      `Create a ${trends[4]} inspired by trends!`
    ],
    music: [
      `Cover a ${trends[0]} in 60 seconds!`,
      `Teach a quick ${trends[1]} on your instrument!`,
      `Try a ${trends[2]} with your viewers!`,
      `React to a ${trends[3]} in a Short!`,
      `Perform a ${trends[4]} for your audience!`
    ],
    general: [
      `Try a ${trends[0]} that fits your style!`,
      `Share a quick ${trends[1]} for your viewers!`,
      `Create a ${trends[2]} inspired Short!`,
      `Show a ${trends[3]} in 60 seconds!`,
      `Engage your audience with a ${trends[4]}!`
    ]
  };

  const ideas = (ideasByNiche[niche] || ideasByNiche['general']).map((idea, index) => ({
    title: idea,
    score: 8 - index // Scores from 8 to 4
  }));

  return ideas;
};

// Endpoint to generate ideas
app.post('/api/ideas', async (req, res) => {
  const { url } = req.body;

  // Validate URL
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Extract channel handle from URL
  const match = url.match(/youtube\.com\/@([\w-]+)/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid YouTube channel URL' });
  }
  const channelHandle = match[1];

  try {
    // Fetch channel details from YouTube Data API
    const youtubeResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=@${channelHandle}&key=${YOUTUBE_API_KEY}`
    );

    if (!youtubeResponse.data.items || youtubeResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channelData = youtubeResponse.data.items[0].snippet;
    const channelTitle = channelData.title;
    const channelDescription = channelData.description;

    // Fetch recent videos to get more context
    const videoResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeResponse.data.items[0].id}&maxResults=5&order=date&key=${YOUTUBE_API_KEY}`
    );

    const recentVideos = videoResponse.data.items.map(item => item.snippet.title);

    // Determine the channel's niche
    const niche = determineNiche(channelDescription, recentVideos);

    // Simulate trending topics for the niche
    const trends = getTrendingTopics(niche);

    // Generate ideas based on niche and trends
    const ideas = generateIdeas(niche, trends, channelTitle, recentVideos);

    // Return the ideas
    res.json({ ideas });
  } catch (error) {
    console.error('Error generating ideas:', error.message);
    if (error.response) {
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

