require('dotenv').config()
const express = require('express');

// SUMMARIZER IMPORTS
const OpenAI = require('openai');

const utils = require('../utils')
const logger = require('heroku-logger')

// SUMMARIZER CONTROLLER
const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_SECRET_KEY
})
const OPEN_AI_GPT_MODEL = "gpt-3.5-turbo-16k"
// const OPEN_AI_GPT_MODEL = "gpt-4-turbo-preview"
const grabDocumentsFromFirestore = async (documentIdArr) => {
   const docReturnArr = [];

   for (let i=0; i < documentIdArr.length; i++) {
      // console.log('document id', documentIdArr[i])
      const docRef = utils.firestoreDb.collection('articles').doc(documentIdArr[i]);
      
      const doc = await docRef.get();
      if (!doc.exists) {
         // console.log('doc doesn\'t exist')
         return;
      } else {
         // console.log('doc exists')
         // console.log(doc.data())
         docReturnArr.push(doc.data())
      }
   }
   // console.log('arr length', docReturnArr.length);
   return docReturnArr;
}
const generateGptMessages = (contentArr) => {
   let messageArr = [];
   contentArr.forEach((contentObj) => {
      const messageObj = {
         role: 'user', content: `The text is titled: ${contentObj.title}. Here is the content: ${contentObj.textContent}`,
      }
      messageArr.push(messageObj);
   })
   return messageArr; 
}
// TODO - find out whether sneding the entire message array when getting the description costs more money or more latency
module.exports.summarizeContentFunction = async (req, res, articleArray) => {
   const numWordsForThirtyMinPodcast = [3000, 4500];
   const systemContext = `You are a content engine, named Palate. I'm going to give you some text and I want you to give me a breakdown of the text, in single person narrative format as if you were recording a podcast explaining the text. The output should be around ${numWordsForThirtyMinPodcast[1]} words long describing, in depth, the takeaways, key points, and interesting parts of the text. Start off by saying, "This podcast is brought to you by Palate".`;
   
   if (!openai.apiKey) {
      logger.error(`Issue with the Open AI API key - ${e.name}: ${e.message}`)
      logger.error(e.stack)
      res.status(500).json({
         response: `There was an issue summarizing the text.`,
         error: {
            name: e.name,
            message: e.message,
            cause: e.cause,
            stack: e.stack
         }
      });
      return;
   }
   try {
      const gptMessageArr = generateGptMessages(articleArray);
      const messages = [
         { role: 'system', content: systemContext },
         ...gptMessageArr
      ]
      const gptResponse = await openai.chat.completions.create({
         model: OPEN_AI_GPT_MODEL,
         messages: messages,
         temperature: 0.2 // lower makes output more focused and deterministic. higher makes output more random/creative
      })
      const summarizedText = gptResponse.choices[0].message.content;
      
      messages.push(gptResponse.choices[0].message)
      messages.push({
         role: 'user', content: 'Now give me a short, ten word description of the text you just generated.'
      })
      // TODO - double check the tokens being sent on this compleetion to see if i may need to reinitialize the API to make sure i'm not wasting tokens
      const gptResponseNum2 = await openai.chat.completions.create({
         model: OPEN_AI_GPT_MODEL,
         messages: messages,
         temperature: 0.2 // lower makes output more focused and deterministic. higher makes output more random/creative
      })
      const palateDescription = gptResponseNum2.choices[0].message.content;
      const newPalate = {
         author: '',
         description: palateDescription,
         text: summarizedText,
         previewImage: articleArray[0].previewImage || "", // check if preview image is null/undefined, if not, return empty string
         siteName: articleArray[0].siteName || "", // check if preview image is null/undefined, if not, return empty string
         title: articleArray[0].title,
         articleId: articleArray[0].id,
         originalArticleUrl: articleArray[0].originalArticleUrl
      }
      const newPalateDbId = await utils.addDataToFirestore(newPalate, 'palates');
      
      const palateDbObject = {
         ...newPalate,
         id: newPalateDbId
      }
      return palateDbObject

   } catch (e) {
      logger.error(`failed to summarize content - ${e.name}: ${e.message}`)
      logger.error(e.stack)
      res.status(503).json({
         response: `Error occured while summarizing content.`,
         error: {
            message: e.message,
            name: e.name,
            cause: e.cause,
            stack: e.stack
         }
      });
   }
}

module.exports.summarizeContentEndpoint = async (req, res) => {
   const articleArray = req.body.articleArray

   const numWordsForThirtyMinPodcast = [3000, 4500];
   const systemContext = `You are a content engine, named Palate. I'm going to give you some text and I want you to give me a breakdown of the text, in single person narrative format as if you were recording a podcast explaining the text. The output should be around ${numWordsForThirtyMinPodcast[1]} words long describing, in depth, the takeaways, key points, and interesting parts of the text. Start off by saying, "This podcast is brought to you by Palate".`;

   if (!openai.apiKey) {
      res.status(500).json({
         error: {
            message: 'Open AI api key is not configured.'
         }
      });
      return;
   }
   try {
      const gptMessageArr = generateGptMessages(articleArray);
      const messages = [
         { role: 'system', content: systemContext },
         ...gptMessageArr
      ]
      const gptResponse = await openai.chat.completions.create({
         model: OPEN_AI_GPT_MODEL,
         messages: messages,
         temperature: 0.2 // lower makes output more focused and deterministic. higher makes output more random/creative
      })
      const summarizedText = gptResponse.choices[0].message.content;
      
      messages.push(gptResponse.choices[0].message)
      messages.push({
         role: 'user', content: 'Now give me a short, ten word description of the text you just generated.'
      })
      const gptResponseNum2 = await openai.chat.completions.create({
         model: OPEN_AI_GPT_MODEL,
         messages: messages,
         temperature: 0.2 // lower makes output more focused and deterministic. higher makes output more random/creative
      })
      const palateDescription = gptResponseNum2.choices[0].message.content;
      // TODO - check to see if any of these are null, if so provide an empty string
      const newPalate = {
         // user: '',
         author: '',
         description: palateDescription,
         text: summarizedText,
         previewImage: articleArray[0].previewImage,
         // title: `Palate #${(6).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})}`,
         siteName: articleArray[0].siteName,
         title: articleArray[0].title
      }
      const newPalateDbId = await utils.addDataToFirestore(newPalate, 'palates');


      res.status(200).json({
         palateId: newPalateDbId,
         palateTitle: articleArray[0].title,
         palateText: summarizedText,
      });
   } catch (e) {
      if (e.response) {
         console.error(e.response.status, e.response.data);
         res.status(e.response.status).json(e.response.data);
      } else {
         console.error(`Error with Open AI API request: ${e.message}`)
         res.status(500).json({
            error: {
               message: `Error occured during the request.`
            }
         });
      }
   }
}

// TESTING FUNCTIONS AND ENDPOINTS
/*
HTTP BODY
   {
      originalArticleUrl: `articleUrl.com`
      articleTitle: `Title of the Article I'm Giving Engine`
      systemContext: `You are a content engine, named Palate. I'm going to give you some text and I want you to give me a breakdown of the text, in single person narrative format as if you were recording a podcast explaining the text. The output should be around 4500 words long describing, in depth, the takeaways, key points, and interesting parts of the text. Start off by saying, "This podcast is brought to you by Palate".`,
      messageObjectArray: [
         {
            role: `user`,
            content: `The text is titled: ${contentObj.title}. Here is the content: ${contentObj.textContent}`,
         },
      ]
   }
*/
module.exports.testSummarizer = async (req, res) => {
   const systemContext = req.body.systemContext
   const messageObjectArray = req.body.messageObjectArray

   const messagesForGptCompletion = [
      { role: 'system', content: systemContext },
      ...messageObjectArray
   ]
   if (!openai.apiKey) {
      console.log('open ai api key not configured correctly')
      logger.error('error! open ai api key not configured correctly.', { code: 500 })
      res.status(500).json({
         error: {
            message: 'Open AI api key is not configured.'
         }
      });
      return;
   }
   try {
      const gptResponse = await openai.chat.completions.create({
         model: OPEN_AI_GPT_MODEL,
         messages: messagesForGptCompletion,
         temperature: 0.2 // lower makes output more focused and deterministic. higher makes output more random/creative
      })
      const summarizedText = gptResponse.choices[0].message.content;
      console.log(gptResponse.usage)

      messagesForGptCompletion.push(gptResponse.choices[0].message)
      messagesForGptCompletion.push({
         role: 'user', content: 'Now give me a short, ten word description of the text you just generated.'
      })
      const gptResponseNum2 = await openai.chat.completions.create({
         model: OPEN_AI_GPT_MODEL,
         messages: messagesForGptCompletion,
         temperature: 0.2 // lower makes output more focused and deterministic. higher makes output more random/creative
      })
      console.log(gptResponseNum2.usage)
      const palateDescription = gptResponseNum2.choices[0].message.content;
      const newPalate = {
         gptMessages: messageObjectArray,
         description: palateDescription,
         text: summarizedText,
         // previewImage: articleArray[0].previewImage || "", // check if preview image is null/undefined, if not, return empty string
         // siteName: articleArray[0].siteName || "", // check if preview image is null/undefined, if not, return empty string
         title: req.body.articleTitle,
         originalArticleUrl: req.body.originalArticleUrl
      }
      const newPalateDbId = await utils.addDataToFirestore(newPalate, 'test_summarizer_results');
      const palateDbObject = {
         ...newPalate,
         id: newPalateDbId
      }
      res.status(200).send(palateDbObject)

   } catch (e) {
      logger.error(`failed to summarize content - ${e.name}: ${e.message}`)
      logger.error(e.stack)
      res.status(500).json({
         response: `Error occured while summarizing content.`,
         error: {
            name: e.name,
            message: e.message,
            cause: e.cause,
            stack: e.stack
         }
      });
   }
}