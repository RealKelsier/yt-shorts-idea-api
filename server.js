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

// Expanded idea templates by niche
const ideaTemplates = {
  finance: [
    "How to Make Money as a {keyword} in 2025",
    "Top 5 {keyword} Hacks for Beginners",
    "{keyword} Challenge: Can You Save $100 in a Week?",
    "Why {keyword} is the Best Side Hustle",
    "How I Made $1,000 with {keyword}",
    "Ultimate {keyword} Guide for Teens",
    "{keyword} Mistakes to Avoid",
    "Can {keyword} Make You Rich?",
  ],
  entertainment: [
    "$1 vs $1,000 {keyword} Challenge",
    "24-Hour {keyword} Survival Challenge",
    "I Tried a Viral {keyword} Stunt!",
    "Last to Leave {keyword} Wins $10,000",
    "Extreme {keyword} Prank Gone Wrong",
    "{keyword} Challenge with Zero Budget",
    "I Survived a {keyword} for 48 Hours",
    "Trying the Craziest {keyword} Trends",
  ],
  gaming: [
    "Can I Win in {keyword} Without Dying?",
    "Ultimate {keyword} Challenge for Noobs",
    "I Played {keyword} for 24 Hours Straight!",
    "Beating {keyword} with the Worst Gear",
    "{keyword} Speedrun: Can I Set a Record?",
    "Trying {keyword} Hacks from TikTok",
    "I Built a {keyword} Empire in One Day",
    "{keyword} Tournament: Winner Takes All",
  ],
  default: [
    "Why {keyword} is Going Viral in 2025",
    "Top 3 {keyword} Tips for Beginners",
    "{keyword} Challenge: Can You Do It?",
    "I Tried {keyword} for the First Time",
    "How to Master {keyword} in a Day",
    "Secrets of {keyword} You Need to Know",
    "Is {keyword} the Next Big Thing?",
    "Trying Viral {keyword} Hacks",
  ],
};

// Function to estimate virality score
function estimateVirality(trendScore, viewsAvg) {
  return Math.min(10, ((trendScore / 100) * 5 + (viewsAvg / 1000000) * 5)).toFixed(1);
}

// Function to shuffle array (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

    const channelId = url.split('/').pop().replace('@', '');

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

    const videos = await youtube.search.list({
      part: 'snippet',
      channelId: realChannelId,
      maxResults: 20,
      order: 'viewCount',
    });

    const titles = videos.data.items.map((v) => v.snippet.title);

    const allWords = titles.flatMap((t) => t.split(' ').map((w) => w.toLowerCase()));
    const keywords = [...new Set(allWords)]
      .filter((word) => !stopWords.includes(word) && word.length > 3)
      .sort((a, b) => allWords.filter((w) => w === b).length - allWords.filter((w) => w === a).length)
      .slice(0, 5);

    if (!keywords.length) {
      return res.status(500).json({ error: 'Could not extract meaningful keywords' });
    }

    const niche = determineNiche(keywords, titles);
    console.log(`Detected niche: ${niche}`);

    // Fetch more related trends (up to 10) for a larger pool
    let topTrends = [];
    try {
      const trends = await googleTrends.relatedQueries({ keyword: keywords[0] });
      topTrends = JSON.parse(trends).default.rankedList[0].rankedKeyword
        .slice(0, 10)
        .map((t) => t.query);
    } catch (trendError) {
      console.error('Trends error:', trendError);
      topTrends = keywords.slice(0, 10);
    }

    // Generate a larger pool of ideas
    const templates = ideaTemplates[niche] || ideaTemplates.default;
    let ideaPool = topTrends.map((trend, i) => {
      const template = templates[i % templates.length];
      const title = template.replace('{keyword}', trend.charAt(0).toUpperCase() + trend.slice(1));
      return {
        title: `🔥 ${title}`,
        score: estimateVirality(90 - i * 10, 800000 + i * 50000),
      };
    });

    // Shuffle the idea pool and pick 5 ideas
    ideaPool = shuffleArray(ideaPool);
    const ideas = ideaPool.slice(0, 5);

    res.json({ ideas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
