require('dotenv').config()
const express = require('express');
// const router = express.Router();

// PARSING ARTICLES IMPORTS
const readability = require('@mozilla/readability')
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const axios = require('axios');
const logger = require('heroku-logger')

const utils = require('../utils')

// SAVE ARTICLE CONTROLLER

module.exports.scrapeWithReadability = async (req, res) => {
   const url = req.body.url
   const Readability = readability.Readability;
   try {
      const { data: rawData } = await axios.get(url); // this returns string of page DOM, can get preview image from here: <meta property="og:image" content="https://i0.wp.com/stratechery.com/wp-content/uploads/2024/01/intel-humbling-2.png?fit=1200%2C581&#038;ssl=1" />
      const dom = new JSDOM(rawData)
      const document = dom.window.document;
      
      let previewImage = document.querySelector('meta[property="og:image"]') // meta element w/ preview image attribute
      if (previewImage) {
         console.log(previewImage.content)
      } else {
         console.log('doesn\'t exist')
      }

      const reader = new Readability(document);
      const article = reader.parse();
      const articleData = {
         url,
         previewImage,
         ...article
      }
      res.send(articleData)
   } catch (e) {
      console.log(`error parsing articles ${e}`)
      res.send(e.message)
      
   }
}

// PARSE ARTICLE CONTROLLER
// TODO: pass in user parameter along with palate url
module.exports.parseAndSaveArticleFunction = async (req, res) => {
   const urls = req.body.urls
   const Readability = readability.Readability;
   
   let arrArticleContent = []

   try {

      for (let i = 0; i < urls.length; i++) {
         const currentUrl = urls[i];
         const { data: rawData } = await axios.get(currentUrl);
         const dom = new JSDOM(rawData)
         const document = dom.window.document;
         let previewImage = document.querySelector('meta[property="og:image"]') // meta element w/ preview image attribute
         const reader = new Readability(document);
         const article = reader.parse();
         const articleData = {
            url: currentUrl,
            previewImage: (previewImage) ? previewImage.content : "", // check if preview image is null, if not, return previewImage.content
            ...article
         }
         const newArticleId = await utils.addDataToFirestore(articleData, "articles")

         arrArticleContent.push({
            id: newArticleId,
            title: article.title,
            previewImage: (previewImage) ? previewImage.content : "", // check if preview image is null, if not, return previewImage.content
            siteName: article.siteName || "",
            textContent: article.textContent,
            originalArticleUrl: currentUrl
         })
      }
      return arrArticleContent
   } catch (e) {
      logger.error(`There was an issue parsing the text at the URL - ${e.name}: ${e.message}`)
      logger.error(e.stack)
      res.status(501).json({
         response: `There was an issue parsing the text at the URL.`,
         error: {
            name: e.name,
            message: e.message,
            cause: e.cause,
            stack: e.stack
         }
      });
   }
}

module.exports.parseAndSaveArticleEndpoint = async (req, res) => {
   const urls = req.body.urls
   console.log(urls);
   const Readability = readability.Readability;

   let arrArticleContent = []
   try {

      for (let i = 0; i < urls.length; i++) {
         const currentUrl = urls[i];
         const { data: rawData } = await axios.get(currentUrl);
         const dom = new JSDOM(rawData)
         const document = dom.window.document;
         let previewImage = document.querySelector('meta[property="og:image"]') // meta element w/ preview image attribute
         const reader = new Readability(document);
         const article = reader.parse();
         const articleData = {
            url: currentUrl,
            previewImage: previewImage.content,
            ...article
         }
         const newArticleId = await utils.addDataToFirestore(articleData, "articles")

         arrArticleContent.push({
            id: newArticleId,
            title: article.title,
            previewImage: previewImage.content,
            siteName: article.siteName,
            textContent: article.textContent
         })
      }
      res.send(arrArticleContent);

   } catch (e) {
      console.log(`error parsing articles ${e}`)
      res.send(e.message);
   }
}