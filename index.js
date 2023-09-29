require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');
const { parse } = require('path');

let mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

let surlSchema = new mongoose.Schema({
  short_url: Number,
  original_url: {
    type: String,
    required: true,
    unique: true
  }
});
let counterSchema = new mongoose.Schema({
  counter_name: {
    type: String,
    unique: true
  },
  next_number: Number
});

let shortUrlModel = mongoose.model('ShortURL', surlSchema);
let counterModel = mongoose.model('Counter', counterSchema);

counterModel.exists({counter_name: 'counter'})
            .then(() => {
              console.log('Counter exists');
            })
            .catch(() => {
              let counter = new counterModel({
                counter_name: 'counter',
                next_number: 1
              });
              counter.save().then(() => {
                console.log("Counter initialized");
              });
            });



// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/', bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


app.post('/api/shorturl', function(req, res) {
  let parsedUrl = url.parse(req.body.url);

  if (parsedUrl.hostname === null) {
    res.json({
      error: 'invalid url'
    })
  } else {
    dns.lookup(parsedUrl.hostname, function(err) {
      if (err) {
        res.json({
          error: 'invalid url'
        });
      } else {
        shortUrlModel.findOne({original_url: req.body.url})
                     .then(data => {
                      let short_url = data.short_url;
                      let original_url = req.body.url;
                      
                      console.log('Found existing entry');

                      res.json({
                        original_url: original_url,
                        short_url: short_url
                      });
                     })
                     .catch(error => {
                      console.log('No existing entries. Creating a new one...')

                      counterModel.findOne({counter_name: 'counter'})
                                  .then(data => {

                                    console.log('Your new URL number is ' + data.next_number);
                                    let counter_number = data.next_number;

                                    console.log('Making new entry...');
                                    let entry = new shortUrlModel({
                                      original_url: req.body.url,
                                      short_url: counter_number
                                    });

                                    entry.save().then(result => { console.log('Entry saved'); });

                                    console.log('Incrementing the counter...')
                                    data.next_number += 1;
                                    data.save().then(result => { console.log('Counter incremented'); });

                                    res.json({
                                      original_url: req.body.url,
                                      short_url: counter_number
                                    });
                                  });
                     });
      }
    });
  }
});

app.get('/api/shorturl/:shorturl', function(req, res) {
    let short_url = req.params.shorturl;
    console.log('Calling for redirection with short url ' + short_url);

    shortUrlModel.findOne({ short_url: short_url })
                 .then(entry => {
                  let original_url = entry.original_url;
                  console.log('Redirecting ' + short_url + ' to ' + original_url);
                  res.redirect(original_url);
                 })
                 .catch(err => {
                  console.log('That short url does not exist yet!');
                 });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
