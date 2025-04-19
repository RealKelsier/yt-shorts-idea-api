require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const googleTrends = require('google-trends-api');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YT_API_KEY,
});

// Common words to filter out
const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'would', 'you', 'fly', 'and', 'or', 'is', 'are'];

// Niche categories and associated keywords
const niches = {
  finance: ['money', 'finance', 'invest', 'earn', 'saving', 'budget', 'wealth', 'income', 'online earnings', 'teenager'],
  entertainment: ['challenge', 'giveaway', 'stunt', 'prank', 'funny', 'viral', 'extreme'],
  gaming: ['game', 'gaming', 'minecraft', 'fortnite', 'play', 'stream', 'esports'],
};

// Idea templates by niche
const ideaTemplates = {
  finance: [
    "How to Make Money as a {keyword} in 2025",
    "Top 5 {keyword} Hacks for Beginners",
    "{keyword} Challenge: Can You Save $100 in a Week?",
  ],
  entertainment: [
    "$1 vs $1,000 {keyword} Challenge",
    "24-Hour {keyword} Survival Challenge",
    "I Tried a Viral {keyword} Stunt!",
  ],
  gaming: [
    "Can I Win in {keyword} Without Dying?",
    "Ultimate {keyword} Challenge for Noobs",
    "I Played {keyword} for 24 Hours Straight!",
  ],
  default: [
    "Why {keyword} is Going Viral in 2025",
    "Top 3 {keyword} Tips for Beginners",
    "{keyword} Challenge: Can You Do It?",
  ],
};

// Function to estimate virality score
function estimateVirality(trendScore, viewsAvg) {
  return Math.min(10, ((trendScore / 100) * 5 + (viewsAvg / 1000000) * 5)).toFixed(1);
}

// Function to determine the channel's niche
function determineNiche(keywords, titles) {
  let nicheScores = {
    finance: 0,
    entertainment: 0,
    gaming: 0,
  };

  keywords.forEach((keyword) => {
    for (let niche in niches) {
      if (niches[niche].includes(keyword.toLowerCase())) {
        nicheScores[niche]++;
      }
    }
  });

  // Also check titles for niche-specific keywords
  titles.forEach((title) => {
    const lowerTitle = title.toLowerCase();
    for (let niche in niches) {
      niches[niche].forEach((keyword) => {
        if (lowerTitle.includes(keyword)) {
          nicheScores[niche]++;
        }
      });
    }
  });

  // Determine the niche with the highest score
  let maxScore = 0;
  let detectedNiche = 'default';
  for (let niche in nicheScores) {
    if (nicheScores[niche] > maxScore) {
      maxScore = nicheScores[niche];
      detectedNiche = niche;
    }
  }

  return detectedNiche;
}

app.post('/api/ideas', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    // Extract channel ID from URL
    const channelId = url.split('/').pop().replace('@', '');

    // Fetch channel details
    const channelData = await youtube.search.list({
      part: 'snippet',
      q: channelId,
      type: 'channel',
      maxResults: 1,
    });

    if (!channelData.data.items.length) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const realChannelId = channelData.data.items[0].id.channelId;

    // Fetch more videos to get better keywords (up to 20)
    const videos = await youtube.search.list({
      part: 'snippet',
      channelId: realChannelId,
      maxResults: 20,
      order: 'viewCount',
    });

    // Extract video titles
    const titles = videos.data.items.map((v) => v.snippet.title);

    // Extract keywords from titles
    const allWords = titles.flatMap((t) => t.split(' ').map((w) => w.toLowerCase()));
    const keywords = [...new Set(allWords)]
      .filter((word) => !stopWords.includes(word) && word.length > 3) // Filter out stop words and short words
      .sort((a, b) => allWords.filter((w) => w === b).length - allWords.filter((w) => w === a).length) // Sort by frequency
      .slice(0, 5); // Take top 5 keywords

    if (!keywords.length) {
      return res.status(500).json({ error: 'Could not extract meaningful keywords' });
    }

    // Determine the channel's niche
    const niche = determineNiche(keywords, titles);
    console.log(`Detected niche: ${niche}`);

    // Fetch related trends for the top keyword
    let topTrends = [];
    try {
      const trends = await googleTrends.relatedQueries({ keyword: keywords[0] });
      topTrends = JSON.parse(trends).default.rankedList[0].rankedKeyword
        .slice(0, 3)
        .map((t) => t.query);
    } catch (trendError) {
      console.error('Trends error:', trendError);
      topTrends = keywords.slice(0, 3);
    }

    // Generate ideas using niche-specific templates
    const templates = ideaTemplates[niche] || ideaTemplates.default;
    const ideas = topTrends.map((trend, i) => {
      const template = templates[i % templates.length];
      const title = template.replace('{keyword}', trend.charAt(0).toUpperCase() + trend.slice(1));
      return {
        title: `🔥 ${title}`,
        score: estimateVirality(90 - i * 15, 800000 + i * 50000),
      };
    });

    res.json({ ideas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
