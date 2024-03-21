require('dotenv').config()
const express = require('express');
const logger = require('heroku-logger')
// TRANSCRIBER IMPORTS 
// const textToSpeech = require("@google-cloud/text-to-speech");
// long form audio
const { TextToSpeechLongAudioSynthesizeClient } = require('@google-cloud/text-to-speech').v1;
const OpenAI = require('openai');
const utils = require('../utils')

// TRANSCRIBER CONTROLLER
const checkIfFileExistsInGoogleCloudStorage = async (bucket, fileName) => {
   const storageBucket = utils.gCloudStorage.bucket(bucket)
   const fileRef = storageBucket.file(fileName)
   const exists = await fileRef.exists()
   return exists[0]
}
module.exports.testDuplicateInCloudStorage = async (req, res) => {
   console.log('hitting test dupe endpoint')
   const bucketPath = "gs://palate-d1218.appspot.com/"
   const fileName = req.body.fileName
   try {
      const response = await checkIfFileExistsInGoogleCloudStorage(bucketPath, fileName)
      
      console.log(response);
      res.status(200).send(response);
   } catch (e) {
      console.log(e);
      res.status(400).send(e);
   }
}
const splitTextForCharacterLimit = (text) => {
   const characterLimitForOpenAIModel = 4096
   const buffer = 50
   const cutPoint = characterLimitForOpenAIModel - buffer;

   const textArr = []
   const numAudios = Math.ceil(text.length / cutPoint)

   for (let i=0; i < numAudios; i++) {
      let str = text.slice( i*cutPoint, cutPoint*(i+1) );
      textArr.push(str);
   }
   return textArr;
}
/*
const newPalate = {
   id: String,
   author: String,
   description: String,
   text: String,
   previewImage: String,
   siteName: String,
   title: String,
   articleId: String,
   originalArticleUrl: String
}
*/
const transcribeTextWithGoogleCloud = async (palate, userId) => {
   const { id, title, text } = palate
   const firestoreCollectionName = "palates"
   const googleTextToSpeechClient = new TextToSpeechLongAudioSynthesizeClient()
   const bucketName = "gs://palate-d1218.appspot.com/"

   // gsUtil URI file path: gs://<bucket_name>/<file_path_inside_bucket>
   const gsUtilUriPath = `${bucketName}${title}.wav`

   try {
      const request = {
         input: { 
            text: text
         },
         audioConfig: {
            audioEncoding: `LINEAR16`
         },
         voice: {
            languageCode: 'en-US',
            // https://cloud.google.com/text-to-speech/docs/voices
            // name: 'en-US-Neural2-D', // old voice
            // name: 'en-US-Casual-K', // option 1
            name: 'en-US-Studio-Q', // option 2
            // ssmlGender: 'NEUTRAL',
         }, 
         parent: `projects/928931080353/locations/us`,
         outputGcsUri: gsUtilUriPath
      };
      // create long audio from text
      const response = await googleTextToSpeechClient.synthesizeLongAudio(request); // this automatically saves it to cloud bucket
      const palateFirestoreDocRef = utils.firestoreDb.collection(firestoreCollectionName).doc(id);
      await palateFirestoreDocRef.update({ audioUrl: gsUtilUriPath })
      await utils.addPalateToFirestoreUser(userId, [id])
      console.log('completed transcription of long form audio')
      logger.info("completed transcription of long form audio")
      
      return response

   } catch (e) {
      console.log(`error transcribing text`)
      console.log(e);
      logger.error(`error transcribing text`, { error: e })
      return `failed to transcribe text: ${e}`
   }

}

const transcribeTextWithOpenAi = async (palate, userId) => {
   const { id, title, text } = palate
   const firestoreCollectionName = "palates"
   const bucketName = "gs://palate-d1218.appspot.com/"
   const storage = utils.gCloudStorage
   const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_SECRET_KEY
   })
   
   // gsUtil URI file path: gs://<bucket_name>/<file_path_inside_bucket>
   const gsUtilUriPath = `${bucketName}${title}.mp3`

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
      const splitText = splitTextForCharacterLimit(text)
      if (splitText.length > 1) {
         let audioArr = [];
         for (let i=0; i < splitText.length; i++) {
            let mp3 = await openai.audio.speech.create({
               model: "tts-1",
               voice: "alloy",
               input: splitText[i],
            });
            audioArr.push(mp3);
         }
         
         let bufferArrList = [];
         for (let i=0; i < audioArr.length; i++) {
            let buf = Buffer.from(await audioArr[i].arrayBuffer());
            bufferArrList.push(buf);
         }
         
         const consolidatedBuffer = Buffer.concat(bufferArrList)
         await storage.bucket(bucketName).file(`${title}.mp3`).save(consolidatedBuffer);
      } else {
         const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            // input: text,
            input: splitText[0],
         });
         const fileBuffer = Buffer.from(await mp3.arrayBuffer());
         await storage.bucket(bucketName).file(`${title}.mp3`).save(fileBuffer);
      }

      const palateFirestoreDocRef = utils.firestoreDb.collection(firestoreCollectionName).doc(id);
      await palateFirestoreDocRef.update({ audioUrl: gsUtilUriPath })
      await utils.addPalateToFirestoreUser(userId, [id])
      
      console.log(`completed transcription of long form audio using open ai`)
      logger.info(`completed transcription of long form audio using open ai`)
   } catch (e) {
      console.log(`error transcribing text`)
      console.log(e);
      logger.error(`error transcribing text`, { error: e })
      return `failed to transcribe text: ${e}`
   }
}

module.exports.transcribeTextWithOpenAiEndpoint = async (req, res) => {
   const palate = req.body.palate
   const userId = req.body.userId
   try {
      // await transcribeTextWithOpenAi(palate, userId)
      await transcribeTextWithOpenAi(palate, userId)
      res.status(200).send({
         response: "successful"
      })
   } catch (e) {
      console.log(e);
      res.status(400).send({
         response: e
      });
   }
}
module.exports.transcribeTextWithGoogleCloudEndpoint = async (req, res) => {
   const palate = req.body.palate
   const userId = req.body.userId
   try {
      await transcribeTextWithGoogleCloud(palate, userId)
      res.status(200).send({
         response: 'success'
      });
   } catch (e) {
      console.log(e);
      res.status(400).send(e);
   }
}

module.exports.transcribeTextWithOpenAi = transcribeTextWithOpenAi
module.exports.transcribeTextWithGoogleCloud = transcribeTextWithGoogleCloud