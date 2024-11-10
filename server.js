const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

// Search history schema
const SearchSchema = new mongoose.Schema({
  term: String,
  timestamp: { type: Date, default: Date.now }
});

const Search = mongoose.model('Search', SearchSchema);

// Routes
app.get('/api/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const page = parseInt(req.query.page) || 1;
    
    // Save search term to database
    await Search.create({ term: query });

    // Call Unsplash API
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&page=${page}&per_page=10`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    const data = await response.json();

    // Format response
    const results = data.results.map(image => ({
      url: image.urls.regular,
      description: image.description || image.alt_description,
      pageUrl: image.links.html
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/recent', async (req, res) => {
  try {
    const searches = await Search.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .select('-_id term timestamp');

    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
