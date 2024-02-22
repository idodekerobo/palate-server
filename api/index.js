require('dotenv').config()
const express = require('express');
const axios = require("axios")
const router = express.Router();

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

const apiUrl = `https://366b-2601-643-8a80-770-30d9-84cd-dff4-70eb.ngrok-free.app`

router.get('/', (req, res) => {
   res.send('this is the palate api')
})

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
   
   res.status(200).send('palate is finished creating')
})

module.exports = router;