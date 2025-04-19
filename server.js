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

// Expanded stop words to filter out vague or irrelevant terms
const stopWords = [
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'would', 'you', 'fly', 'and', 'or', 'is', 'are',
  'this', 'that', 'it', 'of', 'as', 'be', 'was', 'were', 'what', 'how', 'when', 'where', 'why', 'i', 'we', 'they',
  'my', 'your', 'our', 'their', 'vs', 'vlog', 'day', 'part', 'episode', 'short', 'video', 'new', 'best',
];

// Expanded niche categories and associated keywords
const niches = {
  finance: ['money', 'finance', 'invest', 'earn', 'saving', 'budget', 'wealth', 'income', 'online earnings', 'teenager', 'side hustle', 'stocks', 'crypto', 'retire'],
  entertainment: ['challenge', 'giveaway', 'stunt', 'prank', 'funny', 'viral', 'extreme', '24-hour', 'last to', 'survive', 'win'],
  gaming: ['game', 'gaming', 'minecraft', 'fortnite', 'play', 'stream', 'esports', 'speedrun', 'noob', 'pro', 'tournament'],
  tech: ['tech', 'gadget', 'review', 'unboxing', 'apple', 'samsung', 'android', 'ios', 'software', 'hardware'],
  lifestyle: ['lifestyle', 'daily', 'routine', 'morning', 'night', 'travel', 'vlog', 'minimalism', 'productivity', 'self care'],
};

// Expanded and more specific idea templates by niche
const ideaTemplates = {
  finance: [
    "How to Make ${keyword} as a Teenager in 2025",
    "Top 5 ${keyword} Hacks to Build Wealth Fast",
    "${keyword} Challenge: Save $500 in 30 Days!",
    "Why ${keyword} is the Ultimate Side Hustle for Beginners",
    "I Made $1,000 with ${keyword} – Here's How!",
    "Ultimate ${keyword} Guide for Financial Freedom",
    "Avoid These ${keyword} Mistakes to Stay Rich",
    "Can ${keyword} Help You Retire Early?",
  ],
  entertainment: [
    "$1 vs $1,000 ${keyword} Challenge – You Won’t Believe the Results!",
    "24-Hour ${keyword} Survival Challenge – Can I Make It?",
    "I Tried a Viral ${keyword} Stunt and This Happened!",
    "Last to Leave ${keyword} Wins $10,000!",
    "Extreme ${keyword} Prank on My Best Friend!",
    "${keyword} Challenge with Zero Budget – Can It Be Done?",
    "I Survived a ${keyword} for 48 Hours Straight!",
    "Trying the Most Insane ${keyword} Trends on TikTok!",
  ],
  gaming: [
    "Can I Win in ${keyword} Without Taking Damage?",
    " AscendingUltimate ${keyword} Challenge – Noob vs Pro!",
    "I Played ${keyword} for 24 Hours Straight – Here’s What Happened!",
    "Beating ${keyword} with the Worst Gear Possible!",
    "${keyword} Speedrun: Can I Set a New Personal Record?",
    "Trying ${keyword} Hacks I Found on TikTok!",
    "I Built a ${keyword} Empire in Just One Day!",
    "${keyword} Tournament: Winner Takes All the Loot!",
  ],
  tech: [
    "Unboxing the Latest ${keyword} – Worth the Hype?",
    "Top 5 ${keyword} Features You Need to Know About!",
    "I Switched to ${keyword} for a Week – Here’s My Review!",
    "${keyword} vs. the Competition: Which One Wins?",
    "How to Get the Most Out of Your ${keyword} in 2025!",
    "The Future of ${keyword}: What’s Next?",
    "I Tested ${keyword} Hacks – Do They Really Work?",
    "Ultimate ${keyword} Setup for Productivity!",
  ],
  lifestyle: [
    "My ${keyword} Routine for a Productive Day!",
    "24 Hours of ${keyword} – A Day in My Life!",
    "Trying a Viral ${keyword} Trend for a Week!",
    "How I Use ${keyword} to Simplify My Life!",
    "${keyword} Hacks to Boost Your Morning Energy!",
    "I Tried ${keyword} for 30 Days – Here’s What Changed!",
    "Ultimate ${keyword} Guide for Beginners!",
    "Why ${keyword} is Perfect for a Minimalist Lifestyle!",
  ],
  default: [
    "Why ${keyword} is Going Viral in 2025!",
    "Top 3 ${keyword} Tips for Beginners to Get Started!",
    "${keyword} Challenge: Can You Do It Too?",
    "I Tried ${keyword} for the First Time – Here’s What I Learned!",
    "How to Master ${keyword} in Just One Day!",
    "Secrets of ${keyword} You Need to Know About!",
    "Is ${keyword} the Next Big Thing on YouTube?",
    "Trying Viral ${keyword} Hacks – Do They Work?",
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

// Function to extract n-grams (bi-grams and tri-grams) from text
function extractNGrams(text, n) {
  const words = text.toLowerCase().split(/\s+/).filter((word) => !stopWords.includes(word) && word.length > 3);
  const nGrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    const nGram = words.slice(i, i + n).join(' ');
    nGrams.push(nGram);
  }
  return nGrams;
}

// Function to determine the channel's niche
function determineNiche(keywords, titles, description) {
  let nicheScores = {
    finance: 0,
    entertainment: 0,
    gaming: 0,
    tech: 0,
    lifestyle: 0,
  };

  // Score based on keywords (including n-grams)
  keywords.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    for (let niche in niches) {
      niches[niche].forEach((nicheKeyword) => {
        if (lowerKeyword.includes(nicheKeyword)) {
          nicheScores[niche] += keyword.split(' ').length; // Weight multi-word phrases higher
        }
      });
    }
  });

  // Score based on titles
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

  // Score based on channel description
  const lowerDescription = description.toLowerCase();
  for (let niche in niches) {
    niches[niche].forEach((keyword) => {
      if (lowerDescription.includes(keyword)) {
        nicheScores[niche] += 2; // Weight description higher
      }
    });
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

    const channelId = url.split('/').pop().replace('@', '');

    // Fetch channel details (including description)
    const channelData = await youtube.channels.list({
      part: 'snippet',
      forHandle: `@${channelId}`,
    });

    if (!channelData.data.items || channelData.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const realChannelId = channelData.data.items[0].id;
    const channelDescription = channelData.data.items[0].snippet.description || '';

    // Fetch videos to extract titles
    const videos = await youtube.search.list({
      part: 'snippet',
      channelId: realChannelId,
      maxResults: 20,
      order: 'viewCount',
    });

    const titles = videos.data.items.map((v) => v.snippet.title);

    // Extract single words, bi-grams, and tri-grams
    const allWords = titles.flatMap((t) => t.split(' ').map((w) => w.toLowerCase()));
    const singleWords = [...new Set(allWords)]
      .filter((word) => !stopWords.includes(word) && word.length > 3)
      .sort((a, b) => allWords.filter((w) => w === b).length - allWords.filter((w) => w === a).length);

    const biGrams = titles.flatMap((t) => extractNGrams(t, 2));
    const triGrams = titles.flatMap((t) => extractNGrams(t, 3));

    // Combine and prioritize multi-word phrases
    const keywords = [...new Set([...triGrams, ...biGrams, ...singleWords])].slice(0, 10);

    if (!keywords.length) {
      return res.status(500).json({ error: 'Could not extract meaningful keywords' });
    }

    // Determine the channel's niche
    const niche = determineNiche(keywords, titles, channelDescription);
    console.log(`Detected niche: ${niche}, Keywords: ${keywords.join(', ')}`);

    // Fetch related trends for the top keyword (or top multi-word phrase)
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
      const title = template.replace('${keyword}', trend.charAt(0).toUpperCase() + trend.slice(1));
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
