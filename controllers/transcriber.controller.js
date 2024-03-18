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

module.exports.getVoices = async (req, res) => {
   const languageCode = 'en';
   const textToSpeech = require("@google-cloud/text-to-speech");
   const googleTextToSpeechClient = new textToSpeech.TextToSpeechClient();
   try {
      const [result] = await googleTextToSpeechClient.listVoices({ languageCode })
      // let voiceArr = [ ];
      // getVoices.forEach(voice => {
      //    voiceArr.push(voice.name);
      // })
      res.send(result);
   } catch (e) {
      console.log(e);
      res.status(400).send(e);
   }
}
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
module.exports.transcribeTextFunction = async (palate, userId) => {
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

module.exports.transcribeTextWithOpenAi = async (palate, userId) => {
   const { id, title, text } = palate
   const firestoreCollectionName = "palates"
   const bucketName = "gs://palate-d1218.appspot.com/"
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
      const mp3 = await openai.audio.speech.create({
         model: "tts-1",
         voice: "alloy",
         input: text,
      });
      const fileBuffer = Buffer.from(await mp3.arrayBuffer());
      // await fs.promises.writeFile(gsUtilUriPath, fileBuffer);

      const storage = utils.gCloudStorage
      await storage.bucket(bucketName).file(`${title}.mp3`).save(fileBuffer);
      // console.log(`${title} with contents ${fileBuffer} uploaded to ${bucketName}.`);

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
module.exports.transcribeTextEndpoint = async (req, res) => {
   // TODO - pass in the palate id that has the text you want to fetch
   // const palateId = "IIrXS5h0dsftfEsOvAYX"
   const palateId = req.body.palateId;
   const palateTitle = req.body.palateTitle
   
   // TODO - pass in the collections that you want to fetch
   const firestoreCollectionName = "palates"

   // longer audio
   const googleTextToSpeechClient = new TextToSpeechLongAudioSynthesizeClient()
   const bucketName = "gs://palate-d1218.appspot.com/"
    
   const fileName = palateTitle
   
   const palateData = await utils.getFirestoreDocument(palateId, firestoreCollectionName)
   const textToTranscribe = palateData.text;

   // gsUtil URI file path: gs://<bucket_name>/<file_path_inside_bucket>
   console.log('bucket name: ', bucketName)
   console.log('file name: ', fileName)
   const gsUtilUriPath = `${bucketName}${fileName}.wav`

   try {
      const request = {
         input: { 
            text: textToTranscribe
         },
         // long audio
         audioConfig: {
            audioEncoding: `LINEAR16`
         },
         voice: {
            languageCode: 'en-US',
            // https://cloud.google.com/text-to-speech/docs/voices
            name: 'en-US-Neural2-D',
         }, 
         // parent: "palate-d1218",
         parent: `projects/928931080353/locations/us`,
         outputGcsUri: gsUtilUriPath
      };

      // create long audio from text
      const response = await googleTextToSpeechClient.synthesizeLongAudio(request); // this automatically saves it to cloud bucket

      const palateFirestoreDocRef = utils.firestoreDb.collection(firestoreCollectionName).doc(palateId);
      await palateFirestoreDocRef.update({ audioUrl: gsUtilUriPath })
      console.log('completed transcription of long form audio')

      res.status(200).send({
         response: response
      });
   } catch (e) {
      console.log(e);
      res.status(400).send(e);
   }
}