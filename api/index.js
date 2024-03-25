require('dotenv').config()
const express = require('express');
// const axios = require("axios");
const router = express.Router();
const utils = require('../utils')
const logger = require('heroku-logger')

const parserCtrl = require('../controllers/parser.controller')
const summarizerCtrl = require('../controllers/summarizer.controller');
const transcriberCtrl = require('../controllers/transcriber.controller');

// const apiUrl = process.env.API_URL

router.get('/', (req, res) => {
   res.send('this is the palate api')
})

router.get('/palate/:palateId', async (req, res) => {
   console.log('fetching palate from server')
   const palateId = req.params.palateId
   try {
      const palate = await utils.getFirestoreDocument(palateId, "palates")
      res.status(200).send(palate)
   } catch (e) {
      console.log(`error getting palate ${e}`)
      res.status(400).send(e)
   }
})

// CREATE PALATE ENDPOINT
/*
Error Codes
200: Palate is successful
40X
50X: Article couldn't parse
50X: Article too long to summarize
50X: Couldn't transcribe audio
50X: Open API Key not configured
*/
router.post('/createPalate', async (req, res) => {
   logger.info("running logic on create palate endpoint")

   // parse article
   const articleArr = await parserCtrl.parseAndSaveArticleFunction(req, res)
   
   // summarize
   const palate = await summarizerCtrl.summarizeContentFunction(req, res, articleArr)
   // console.log('palate returned from summarizer', palate)

   // transcribe
   const transcriberResponse = await transcriberCtrl.transcribeTextWithOpenAi(req, res, palate);
   res.status(200).send("Your Palate was successfully created")
})

/*
==========================================================================================
                                    TESTING ROUTES
==========================================================================================
*/
// PARSE ARTICLE ROUTES
router.post('/scrape-article', parserCtrl.scrapeWithReadability)
router.post('/parse-article', parserCtrl.parseAndSaveArticleEndpoint)

// SUMMARIZER ROUTES
router.post('/summarize-content', summarizerCtrl.summarizeContentEndpoint);
router.post('/testSummarizer', summarizerCtrl.testSummarizer)

// TRANSCRIBER ROUTES
router.post('/transcribe-text', transcriberCtrl.transcribeTextWithOpenAiEndpoint);

// GCLOUD
router.post('/testDuplicateInCloudStorage', transcriberCtrl.testDuplicateInCloudStorage)

module.exports = router;