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

// Idea templates by video type and niche
const ideaTemplates = {
  finance: {
    challenge: [
      "${trendingTopic} Challenge: Can You Save $500 in a Week?",
      "I Tried a ${trendingTopic} Budget Challenge for 30 Days!",
      "${trendingTopic} vs. Traditional Investing: Which Wins?",
    ],
    tutorial: [
      "How to Use ${trendingTopic} to Make Money in 2025!",
      "Top 5 ${trendingTopic} Hacks to Build Wealth Fast!",
      "Ultimate ${trendingTopic} Guide for Financial Freedom!",
    ],
    vlog: [
      "A Day in My Life Using ${trendingTopic} to Earn Money!",
      "My ${trendingTopic} Side Hustle Routine – Does It Work?",
      "I Tried ${trendingTopic} for a Week – Here’s What I Learned!",
    ],
  },
  entertainment: {
    challenge: [
      "$1 vs $1,000 ${trendingTopic} Challenge – You Won’t Believe the Results!",
      "24-Hour ${trendingTopic} Survival Challenge – Can I Make It?",
      "Last to Leave ${trendingTopic} Wins $10,000!",
    ],
    giveaway: [
      "I’m Giving Away a ${trendingTopic} to One Lucky Subscriber!",
      "Win a ${trendingTopic} by Completing This Challenge!",
      "${trendingTopic} Giveaway: Enter to Win Now!",
    ],
    vlog: [
      "A Day in My Life with ${trendingTopic} – Insane Results!",
      "I Tried ${trendingTopic} for 24 Hours – Here’s What Happened!",
      "Behind the Scenes of My ${trendingTopic} Challenge!",
    ],
  },
  gaming: {
    challenge: [
      "Can I Win in ${trendingTopic} Without Taking Damage?",
      "Ultimate ${trendingTopic} Challenge: Noob vs Pro!",
      "I Played ${trendingTopic} for 24 Hours Straight – Here’s What Happened!",
    ],
    tutorial: [
      "How to Master ${trendingTopic} in Just One Day!",
      "Top 5 ${trendingTopic} Tips for Beginners!",
      "Ultimate ${trendingTopic} Guide to Level Up Fast!",
    ],
    vlog: [
      "A Day in My Life as a ${trendingTopic} Streamer!",
      "I Tried ${trendingTopic} Hacks for a Week – Do They Work?",
      "My ${trendingTopic} Gaming Setup Tour!",
    ],
  },
  tech: {
    review: [
      "Unboxing the Latest ${trendingTopic} – Worth the Hype?",
      "I Tested ${trendingTopic} – Here’s My Honest Review!",
      "${trendingTopic} vs. the Competition: Which One Wins?",
    ],
    tutorial: [
      "How to Get the Most Out of Your ${trendingTopic} in 2025!",
      "Top 5 ${trendingTopic} Features You Need to Know About!",
      "Ultimate ${trendingTopic} Setup for Productivity!",
    ],
    vlog: [
      "A Day in My Life Using ${trendingTopic} – Game Changer?",
      "I Switched to ${trendingTopic} for a Week – Here’s What I Learned!",
      "My ${trendingTopic} Tech Routine – How I Stay Productive!",
    ],
  },
  lifestyle: {
    vlog: [
      "My ${trendingTopic} Routine for a Productive Day!",
      "24 Hours of ${trendingTopic} – A Day in My Life!",
      "I Tried ${trendingTopic} for 30 Days – Here’s What Changed!",
    ],
    tutorial: [
      "How I Use ${trendingTopic} to Simplify My Life!",
      "${trendingTopic} Hacks to Boost Your Morning Energy!",
      "Ultimate ${trendingTopic} Guide for a Minimalist Lifestyle!",
    ],
    challenge: [
      "I Tried a ${trendingTopic} Challenge for a Week – Can I Do It?",
      "${trendingTopic} Productivity Challenge: 30 Days to Change!",
      "Can You Live a ${
