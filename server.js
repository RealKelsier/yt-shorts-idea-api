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

function estimateVirality(trendScore, viewsAvg) {
  return Math.min(10, ((trendScore / 100) * 5 + (viewsAvg / 1000000) * 5)).toFixed(1);
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
      maxResults: 10,
      order: 'viewCount',
    });

    const titles = videos.data.items.map((v) => v.snippet.title);
    const keywords = [...new Set(titles.flatMap((t) => t.split(' ')))].slice(0, 5);

    let topTrends = [];
    try {
      const trends = await googleTrends.relatedQueries({ keyword: keywords[0] });
      topTrends = JSON.parse(trends).default.rankedList[0].rankedKeyword
        .slice(0, 3)
        .map((t) => t.query);
    } catch (trendError) {
      topTrends = keywords.slice(0, 3);
    }

    const ideas = topTrends.map((trend, i) => ({
      title: `🔥 ${trend.charAt(0).toUpperCase() + trend.slice(1)} - Short #${i + 1}`,
      score: estimateVirality(90 - i * 15, 800000 + i * 50000),
    }));

    res.json({ ideas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
