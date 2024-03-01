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
   
   // const articleParserResponse = await axios.post(`${apiUrl}/parse-article`, {urls: req.body.urls})
   // const articleArr = articleParserResponse.data
   const articleArr = await parserCtrl.parseAndSaveArticleFunction(req.body.urls)
   // console.log('article array from create palate', articleArr)
   
   // summarize
   // const summarizerResponse = await axios.post(`${apiUrl}/summarize-content`, { articleArray: articleArr })
   // const { palateId, palateTitle } = summarizerResponse.data
   const palate = await summarizerCtrl.summarizeContentFunction(articleArr)
   // console.log('from createPalate endpoint: return of summarize content post request: ', palate.id);

   // transcribe
   // const transcriberResponse = await axios.post(`${apiUrl}/transcribe-text`, { palateId: palateId, palateTitle: palateTitle })
   // const { response: transcriberResult } =  transcriberResponse.data
   const transcriberResponse = await transcriberCtrl.transcribeTextFunction(palate)
   console.log('transcriber response', transcriberResponse);
   
   // res.status(200).send('palate is finished creating')
   res.status(200).send("palate successfully created")
})

module.exports = router;