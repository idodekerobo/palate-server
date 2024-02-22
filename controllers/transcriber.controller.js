require('dotenv').config()
const express = require('express');

// TRANSCRIBER IMPORTS 
// const textToSpeech = require("@google-cloud/text-to-speech");

// long form audio
const { TextToSpeechLongAudioSynthesizeClient } = require('@google-cloud/text-to-speech').v1;

const utils = require('../utils')

// Google Cloud functions
// module.exports.getVoices = async (req, res) => {
//    const languageCode = 'en';
//    const googleTextToSpeechClient = new textToSpeech.TextToSpeechClient();

//    try {
//       const [result] = await googleTextToSpeechClient.listVoices({ languageCode })
//       const voiceArr = [ ];
//       // getVoices.forEach(voice => {
//       //    voiceArr.push(voice.name);
//       // })
//       res.send(result);
//    } catch (e) {
//       console.log(e);
//       res.status(400).send(e);
//    }
// }

// TRANSCRIBER CONTROLLER
/*
const newPalate = {
   id: ''
   author: '',
   description: palateDescription,
   text: summarizedText,
   previewImage: articleArray[0].previewImage,
   // title: `Palate #${(6).toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping:false})}`,
   siteName: articleArray[0].siteName,
   title: articleArray[0].title
}
*/
module.exports.transcribeTextFunction = async (palate) => {
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
            name: 'en-US-Neural2-D',
            // ssmlGender: 'NEUTRAL',
         }, 
         parent: `projects/928931080353/locations/us`,
         outputGcsUri: gsUtilUriPath
      };
      // create long audio from text
      const response = await googleTextToSpeechClient.synthesizeLongAudio(request); // this automatically saves it to cloud bucket
      const palateFirestoreDocRef = utils.firestoreDb.collection(firestoreCollectionName).doc(id);
      await palateFirestoreDocRef.update({ audioUrl: gsUtilUriPath })
      console.log('completed transcription of long form audio')
      
      return response

   } catch (e) {
      console.log(`error transcribing text`)
      console.log(e);
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

   // const googleTextToSpeechClient = new textToSpeech.TextToSpeechClient();

   // longer audio
   const googleTextToSpeechClient = new TextToSpeechLongAudioSynthesizeClient()
   const bucketName = "gs://palate-d1218.appspot.com/"
    
   // const date = new Date()
   // const fileName = `Palate #006, ${date.toLocaleTimeString()}.mp3`
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
         // voice: {
         //    languageCode: 'en-US',
         //    ssmlGender: 'NEUTRAL',
         // },
         // audioConfig: {
         //    audioEncoding: 'MP3'
         // },
         
         // long audio
         audioConfig: {
            audioEncoding: `LINEAR16`
         },
         voice: {
            languageCode: 'en-US',
            // https://cloud.google.com/text-to-speech/docs/voices
            name: 'en-US-Neural2-D',
            // ssmlGender: 'NEUTRAL',
         }, 
         // parent: "palate-d1218",
         parent: `projects/928931080353/locations/us`,
         outputGcsUri: gsUtilUriPath
      };
      
      // create audio from text
      // const response = await googleTextToSpeechClient.synthesizeSpeech(request);

      // create long audio from text
      const response = await googleTextToSpeechClient.synthesizeLongAudio(request); // this automatically saves it to cloud bucket
      // const bufferData = response[0].latestResponse.value.data
      // const audioContent = response[0].audioContent

      // // save audio to google cloud bucket
      // await utils.gCloudStorage.bucket(bucketName).file(fileName).save(audioContent);
      

      const palateFirestoreDocRef = utils.firestoreDb.collection(firestoreCollectionName).doc(palateId);
      await palateFirestoreDocRef.update({ audioUrl: gsUtilUriPath })
      console.log('completed transcription of long form audio')

      res.status(200).send({
         // response: 'audio content created and uploaded to cloud and cloud uri path stored in database'
         response: response
      });
   } catch (e) {
      console.log(e);
      res.status(400).send(e);
   }
}

// module.exports.uploadAudioToCloud = async (req, res) => {
//    try {
//       const bucketName = "gs://palate-d1218.appspot.com/"
//       const options = {
//          destFileName: 'audio001.mp3',
//          generateMatchPrecondition: 0
//       }
//       await utils.gCloudStorage.bucket(bucketName).upload('./palate-output.mp3', options)
//       res.status(200).send('audio content written to cloud storage');
//    } catch (e) {
//       console.log(e);
//       res.status(400).send(e);
//    }
// }

// const updateDbPromise = () => {
      //    return palateFirestoreDocRef.then(docRef => {
      //       docRef.update({ gsUtilUri: gsUtilUriPath })
      //    }).catch(err => {
      //       console.log(err);
      //       res.status(400).send(err);
      //    })
      // }
      // const saveToCloudPromise = () => {
      //    const file = utils.gCloudStorage.bucket(bucketName).file(fileName)
      //    return file.save(audioContent).then(result => {
      //       console.log('save successful');
      //    }).catch(err => {
      //       console.log(err);
      //       res.status(400).send(err);
      //    })
      // }
      // const promiseResponse = await Promise.all([ saveToCloudPromise, updateDbPromise ])
      // res.status(200).send(promiseResponse)