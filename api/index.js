require('dotenv').config()
const express = require('express');
const axios = require("axios")
const router = express.Router();
const utils = require('../utils')

const parserCtrl = require('../controllers/parser.controller')
const summarizerCtrl = require('../controllers/summarizer.controller');
const transcriberCtrl = require('../controllers/transcriber.controller');

// PARSE ARTICLE ROUTES
router.post('/postArticleData', parserCtrl.scrapeWithReadability)
router.post('/parse-article', parserCtrl.parseAndSaveArticleEndpoint)

// SUMMARIZER ROUTES
router.post('/summarize-content', summarizerCtrl.summarizeContentEndpoint);

// TRANSCRIBER ROUTES
router.post('/transcribe-text', transcriberCtrl.transcribeTextEndpoint);

const apiUrl = process.env.API_URL

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
router.get('/get-voices', transcriberCtrl.getVoices)

// TODO: edit this function to also take into account user id so palates are specific to user
router.post('/createPalate', async (req, res) => {
   console.log("running logic on create palate endpoint")
   // parse article
   const articleArr = await parserCtrl.parseAndSaveArticleFunction(req.body.urls)
   console.log('article array returned from parse and save article', articleArr)
   
   // summarize
   const palate = await summarizerCtrl.summarizeContentFunction(articleArr)
   console.log('palate returned from summarizer', palate)

   // transcribe
   const transcriberResponse = await transcriberCtrl.transcribeTextFunction(palate, req.body.userId)
   console.log('transcriber response', transcriberResponse)
   res.status(200).send("palate successfully created")
})

module.exports = router;