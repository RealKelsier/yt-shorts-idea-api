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

// Stop words to filter out vague terms
const stopWords = [
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'would', 'you', 'fly', 'and', 'or', 'is', 'are',
  'this', 'that', 'it', 'of', 'as', 'be', 'was', 'were', 'what', 'how', 'when', 'where', 'why', 'i', 'we', 'they',
  'my', 'your', 'our', 'their', 'vs', 'vlog', 'day', 'part', 'episode', 'short', 'video', 'new', 'best',
];

// Niche categories and associated keywords
const niches = {
  finance: ['money', 'finance', 'invest', 'earn', 'saving', 'budget', 'wealth', 'income', 'online earnings', 'teenager', 'side hustle', 'stocks', 'crypto', 'retire'],
  entertainment: ['challenge', 'giveaway', 'stunt', 'prank', 'funny', 'viral', 'extreme', '24-hour', 'last to', 'survive', 'win'],
  gaming: ['game', 'gaming', 'minecraft', 'fortnite', 'play', 'stream', 'esports', 'speedrun', 'noob', 'pro', 'tournament'],
  tech: ['tech', 'gadget', 'review', 'unboxing', 'apple', 'samsung', 'android', 'ios', 'software', 'hardware'],
  lifestyle: ['lifestyle', 'daily', 'routine', 'morning', 'night', 'travel', 'vlog', 'minimalism', 'productivity', 'self care'],
};

// Video type patterns (to classify the channel's video style)
const videoTypes = {
  challenge: ['challenge', '24-hour', 'last to', 'vs', '$1', '$1000', '$10000', 'survive', 'try', 'attempt'],
  giveaway: ['giveaway', 'win', 'prize', 'gift', 'giving away'],
  tutorial: ['how to', 'guide', 'tutorial', 'tips', 'hacks', 'learn', 'step by step'],
  vlog: ['vlog', 'day in my life', 'routine', 'morning', 'night', 'travel', 'daily'],
  review: ['review', 'unboxing', 'tested', 'tried', 'thoughts', 'vs', 'comparison'],
};

// Idea templates by video type and niche (expanded for variety)
const ideaTemplates = {
  finance: {
    challenge: [
      "${trendingTopic} Challenge: Can You Save $500 in a Week?",
      "I Tried a ${trendingTopic} Budget Challenge for 30 Days!",
      "${trendingTopic} vs. Traditional Investing: Which Wins?",
      "Survive on ${trendingTopic} for a Month – Can It Be Done?",
      "I Invested $100 in ${trendingTopic} – Here’s What Happened!",
    ],
    tutorial: [
      "How to Use ${trendingTopic} to Make Money in 2025!",
      "Top 5 ${trendingTopic} Hacks to Build Wealth Fast!",
      "Ultimate ${trendingTopic} Guide for Financial Freedom!",
      "Why ${trendingTopic} Could Be Your Next Big Income Stream!",
      "Master ${trendingTopic} Investing with These 3 Tips!",
    ],
    vlog: [
      "A Day in My Life Using ${trendingTopic} to Earn Money!",
      "My ${trendingTopic} Side Hustle Routine – Does It Work?",
      "I Tried ${trendingTopic} for a Week – Here’s What I Learned!",
      "How ${trendingTopic} Changed My Financial Life!",
      "Behind the Scenes: My ${trendingTopic} Money-Making Journey!",
    ],
  },
  entertainment: {
    challenge: [
      "$1 vs $1,000 ${trendingTopic} Challenge – You Won’t Believe the Results!",
      "24-Hour ${trendingTopic} Survival Challenge – Can I Make It?",
      "Last to Leave ${trendingTopic} Wins $10,000!",
      "I Attempted a ${trendingTopic} Challenge with No Prep!",
      "Extreme ${trendingTopic} Challenge – Can I Survive?",
    ],
    giveaway: [
      "I’m Giving Away a ${trendingTopic} to One Lucky Subscriber!",
      "Win a ${trendingTopic} by Completing This Challenge!",
      "${trendingTopic} Giveaway: Enter to Win Now!",
      "Surprise ${trendingTopic} Giveaway – Don’t Miss Out!",
      "I Gave Away ${trendingTopic} to a Random Fan!",
    ],
    vlog: [
      "A Day in My Life with ${trendingTopic} – Insane Results!",
      "I Tried ${trendingTopic} for 24 Hours – Here’s What Happened!",
      "Behind the Scenes of My ${trendingTopic} Challenge!",
      "How ${trendingTopic} Changed My Day – Full Vlog!",
      "My ${trendingTopic} Adventure – You Have to See This!",
    ],
  },
  gaming: {
    challenge: [
      "Can I Win in ${trendingTopic} Without Taking Damage?",
      "Ultimate ${trendingTopic} Challenge: Noob vs Pro!",
      "I Played ${trendingTopic} for 24 Hours Straight – Here’s What Happened!",
      "Survive ${trendingTopic} with Only One Life – Can I Do It?",
      "I Attempted a ${trendingTopic} World Record!",
    ],
    tutorial: [
      "How to Master ${trendingTopic} in Just One Day!",
      "Top 5 ${trendingTopic} Tips for Beginners!",
      "Ultimate ${trendingTopic} Guide to Level Up Fast!",
      "Secrets to Dominate ${trendingTopic} – You Need These!",
      "Why ${trendingTopic} Is the Game to Play in 2025!",
    ],
    vlog: [
      "A Day in My Life as a ${trendingTopic} Streamer!",
      "I Tried ${trendingTopic} Hacks for a Week – Do They Work?",
      "My ${trendingTopic} Gaming Setup Tour!",
      "How I Got Addicted to ${trendingTopic} – Full Vlog!",
      "Behind the Scenes: My ${trendingTopic} Tournament Day!",
    ],
  },
  tech: {
    review: [
      "Unboxing the Latest ${trendingTopic} – Worth the Hype?",
      "I Tested ${trendingTopic} – Here’s My Honest Review!",
      "${trendingTopic} vs. the Competition: Which One Wins?",
      "Is ${trendingTopic} the Future of Tech? My Thoughts!",
      "I Used ${trendingTopic} for a Week – Pros and Cons!",
    ],
    tutorial: [
      "How to Get the Most Out of Your ${trendingTopic} in 2025!",
      "Top 5 ${trendingTopic} Features You Need to Know About!",
      "Ultimate ${trendingTopic} Setup for Productivity!",
      "Why ${trendingTopic} Is a Game Changer – Setup Guide!",
      "Master ${trendingTopic} with These Hidden Features!",
    ],
    vlog: [
      "A Day in My Life Using ${trendingTopic} – Game Changer?",
      "I Switched to ${trendingTopic} for a Week – Here’s What I Learned!",
      "My ${trendingTopic} Tech Routine – How I Stay Productive!",
      "How ${trendingTopic} Fits Into My Daily Life – Full Vlog!",
      "Behind the Scenes: My ${trendingTopic} Testing Day!",
    ],
  },
  lifestyle: {
    vlog: [
      "My ${trendingTopic} Routine for a Productive Day!",
      "24 Hours of ${trendingTopic} – A Day in My Life!",
      "I Tried ${trendingTopic} for 30 Days – Here’s What Changed!",
      "How ${trendingTopic} Fits Into My Daily Routine!",
      "A Week of ${trendingTopic} – My Lifestyle Journey!",
    ],
    tutorial: [
      "How I Use ${trendingTopic} to Simplify My Life!",
      "${trendingTopic} Hacks to Boost Your Morning Energy!",
      "Ultimate ${trendingTopic} Guide for a Minimalist Lifestyle!",
      "Why ${trendingTopic} Is Perfect for Self-Care!",
      "Master ${trendingTopic} with These 3 Daily Tips!",
    ],
    challenge: [
      "I Tried a ${trendingTopic} Challenge for a Week – Can I Do It?",
      "${trendingTopic} Productivity Challenge: 30 Days to Change!",
      "Can You Live a ${trendingTopic} Lifestyle for a Day?",
      "I Attempted a ${trendingTopic} Challenge – Here’s How It Went!",
      "Survive a ${trendingTopic} Challenge with Me!",
    ],
  },
  default: {
    challenge: [
      "${trendingTopic} Challenge: Can You Do It Too?",
      "I Tried a ${trendingTopic} Challenge for 24 Hours!",
      "${trendingTopic} vs. Me: Who Wins?",
      "Survive a ${trendingTopic} Challenge – Can I Make It?",
      "I Attempted a ${trendingTopic} Challenge – Insane Results!",
    ],
    tutorial: [
      "How to Get Started with ${trendingTopic} in 2025!",
      "Top 3 ${trendingTopic} Tips for Beginners!",
      "Ultimate ${trendingTopic} Guide for Newbies!",
      "Why ${trendingTopic} Is Trending – Get Started Now!",
      "Master ${trendingTopic} with These Simple Steps!",
    ],
    vlog: [
      "A Day in My Life with ${trendingTopic} – Here’s What I Learned!",
      "I Tried ${trendingTopic} for a Week – Here’s What Happened!",
      "My ${trendingTopic} Journey – Behind the Scenes!",
      "How ${trendingTopic} Changed My Day – Full Vlog!",
      "A Week of ${trendingTopic} – My Story!",
    ],
  },
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

  keywords.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    for (let niche in niches) {
      niches[niche].forEach((nicheKeyword) => {
        if (lowerKeyword.includes(nicheKeyword)) {
          nicheScores[niche] += keyword.split(' ').length;
        }
      });
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

  const lowerDescription = description.toLowerCase();
  for (let niche in niches) {
    niches[niche].forEach((keyword) => {
      if (lowerDescription.includes(keyword)) {
        nicheScores[niche] += 2;
      }
    });
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

// Function to determine the channel's video type (enhanced to include descriptions and tags)
async function determineVideoType(videos, titles) {
  let typeScores = {
    challenge: 0,
    giveaway: 0,
    tutorial: 0,
    vlog: 0,
    review: 0,
  };

  // Fetch video details (including descriptions and tags)
  const videoDetails = await youtube.videos.list({
    part: 'snippet',
    id: videos.map((v) => v.id.videoId).join(','),
  });

  const descriptions = videoDetails.data.items.map((v) => v.snippet.description || '');
  const tags = videoDetails.data.items.flatMap((v) => v.snippet.tags || []);

  // Score based on titles
  titles.forEach((title) => {
    const lowerTitle = title.toLowerCase();
    for (let type in videoTypes) {
      videoTypes[type].forEach((keyword) => {
        if (lowerTitle.includes(keyword)) {
          typeScores[type]++;
        }
      });
    }
  });

  // Score based on descriptions
  descriptions.forEach((desc) => {
    const lowerDesc = desc.toLowerCase();
    for (let type in videoTypes) {
      videoTypes[type].forEach((keyword) => {
        if (lowerDesc.includes(keyword)) {
          typeScores[type]++;
        }
      });
    }
  });

  // Score based on tags
  tags.forEach((tag) => {
    const lowerTag = tag.toLowerCase();
    for (let type in videoTypes) {
      videoTypes[type].forEach((keyword) => {
        if (lowerTag.includes(keyword)) {
          typeScores[type]++;
        }
      });
    }
  });

  let maxScore = 0;
  let detectedType = 'vlog'; // Default to vlog if no clear type is detected
  for (let type in typeScores) {
    if (typeScores[type] > maxScore) {
      maxScore = typeScores[type];
      detectedType = type;
    }
  }

  return detectedType;
}

// Function to map YouTube category ID to niche
function mapCategoryToNiche(categoryId) {
  const categoryMap = {
    '1': 'entertainment',  // Film & Animation
    '2': 'entertainment',  // Autos & Vehicles
    '10': 'entertainment', // Music
    '15': 'lifestyle',     // Pets & Animals
    '17': 'entertainment', // Sports
    '19': 'lifestyle',     // Travel & Events
    '20': 'gaming',        // Gaming
    '22': 'lifestyle',     // People & Blogs
    '24': 'entertainment', // Entertainment
    '25': 'lifestyle',     // News & Politics
    '26': 'lifestyle',     // How-to & Style
    '27': 'lifestyle',     // Education
    '28': 'tech',          // Science & Technology
  };
  return categoryMap[categoryId] || 'default';
}

// Function to check similarity between two strings (simple word overlap)
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = [...words1].filter((word) => words2.has(word));
  return intersection.length / Math.min(words1.size, words2.size);
}

app.post('/api/ideas', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    const channelId = url.split('/').pop().replace('@', '');

    // Fetch channel details (including description and category)
    const channelData = await youtube.channels.list({
      part: 'snippet,contentDetails,statistics,topicDetails',
      forHandle: `@${channelId}`,
    });

    if (!channelData.data.items || channelData.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const realChannelId = channelData.data.items[0].id;
    const channelDescription = channelData.data.items[0].snippet.description || '';
    const categoryId = channelData.data.items[0].topicDetails?.topicCategories?.[0]?.split('/').pop() || '24'; // Default to Entertainment

    // Fetch videos to extract titles
    const videosResponse = await youtube.search.list({
      part: 'snippet',
      channelId: realChannelId,
      maxResults: 20,
      order: 'viewCount',
    });

    const videos = videosResponse.data.items;
    const titles = videos.map((v) => v.snippet.title);

    // Extract keywords (single words, bi-grams, tri-grams)
    const allWords = titles.flatMap((t) => t.split(' ').map((w) => w.toLowerCase()));
    const singleWords = [...new Set(allWords)]
      .filter((word) => !stopWords.includes(word) && word.length > 3)
      .sort((a, b) => allWords.filter((w) => w === b).length - allWords.filter((w) => w === a).length);

    const biGrams = titles.flatMap((t) => extractNGrams(t, 2));
    const triGrams = titles.flatMap((t) => extractNGrams(t, 3));

    const keywords = [...new Set([...triGrams, ...biGrams, ...singleWords])].slice(0, 10);

    if (!keywords.length) {
      return res.status(500).json({ error: 'Could not extract meaningful keywords' });
    }

    // Determine the channel's niche
    const nicheFromKeywords = determineNiche(keywords, titles, channelDescription);
    const nicheFromCategory = mapCategoryToNiche(categoryId);
    const niche = nicheFromKeywords !== 'default' ? nicheFromKeywords : nicheFromCategory;
    console.log(`Detected niche: ${niche}, Keywords: ${keywords.join(', ')}`);

    // Determine the channel's video type
    const videoType = await determineVideoType(videos, titles);
    console.log(`Detected video type: ${videoType}`);

    // Fetch trending topics from Google Trends (using dailyTrends for real-time trends)
    let trendingTopics = [];
    try {
      const trends = await googleTrends.dailyTrends({ geo: 'US' });
      const trendData = JSON.parse(trends).default.trendingSearchesDays[0].trendingSearches;
      trendingTopics = trendData.map((t) => t.title.query).slice(0, 10);
    } catch (trendError) {
      console.error('Google Trends error:', trendError);
      trendingTopics = keywords.slice(0, 10);
    }

    // Fetch trending videos from YouTube in the same category
    let youtubeTrendingTopics = [];
    try {
      const trendingVideos = await youtube.videos.list({
        part: 'snippet',
        chart: 'mostPopular',
        videoCategoryId: categoryId,
        maxResults: 10,
      });
      youtubeTrendingTopics = trendingVideos.data.items.map((v) => {
        const titleWords = v.snippet.title.split(' ').filter((w) => !stopWords.includes(w.toLowerCase())).join(' ');
        const descWords = v.snippet.description.split(' ').slice(0, 10).filter((w) => !stopWords.includes(w.toLowerCase())).join(' ');
        return `${titleWords} ${descWords}`.trim();
      });
    } catch (youtubeError) {
      console.error('YouTube Trending error:', youtubeError);
      youtubeTrendingTopics = [];
    }

    // Combine trending topics
    let allTrendingTopics = [...new Set([...trendingTopics, ...youtubeTrendingTopics])];

    // Filter out topics that are too similar to the channel's existing content
    const channelContent = [...titles, channelDescription].join(' ').toLowerCase();
    allTrendingTopics = allTrendingTopics.filter((topic) => {
      const similarity = calculateSimilarity(topic, channelContent);
      return similarity < 0.5; // Keep topics with less than 50% overlap
    }).slice(0, 10);

    if (!allTrendingTopics.length) {
      return res.status(500).json({ error: 'Could not fetch unique trending topics' });
    }

    // Generate a pool of ideas using the video type and trending topics
    const templates = ideaTemplates[niche]?.[videoType] || ideaTemplates.default[videoType] || ideaTemplates.default.vlog;
    let ideaPool = allTrendingTopics.map((topic, i) => {
      const template = templates[i % templates.length];
      const title = template.replace('${trendingTopic}', topic.charAt(0).toUpperCase() + topic.slice(1));
      return {
        title: `🔥 ${title}`,
        score: estimateVirality(90 - i * 10, 800000 + i * 50000),
      };
    });

    // Shuffle and pick 5 ideas
    ideaPool = shuffleArray(ideaPool);
    const ideas = ideaPool.slice(0, 5);

    res.json({ ideas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  const lowerDescription = description.toLowerCase();
  for (let niche in niches) {
    niches[niche].forEach((keyword) => {
      if (lowerDescription.includes(keyword)) {
        nicheScores[niche] += 2; // Give extra weight to description matches
      }
    });
  }

  // Determine the niche with the highest score
  const sortedNiches = Object.entries(nicheScores).sort((a, b) => b[1] - a[1]);
  return sortedNiches[0][1] > 0 ? sortedNiches[0][0] : 'default';
}

