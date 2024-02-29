// Firebase
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { auth } = require('google-auth-library');

// firebase
initializeApp({
  credential: cert({
    type: process.env.FB_CERT_CREDENTIAL_TYPE,
    project_id: process.env.FB_CERT_PROJECT_ID,
    private_key_id: process.env.FB_CERT_PRIVATE_KEY_ID,
    private_key: process.env.FB_CERT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FB_CERT_CLIENT_EMAIL,
    client_id: process.env.FB_CERT_CLIENT_ID,
    auth_uri: process.env.FB_CERT_AUTH_URI,
    token_uri: process.env.FB_CERT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FB_CERT_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FB_CERT_CLIENT_CERT_URL,
    universe_domain: process.env.FB_CERT_UNIVERSE_DOMAIN
  }),
  storageBucket: 'palate-d1218.appspot.com'
});

const { getFirestore, /*Timestamp, FieldValue, Filter */ } = require('firebase-admin/firestore');
const { Storage } = require("@google-cloud/storage");

const firestoreDb = getFirestore();


const getGCPCredentials = () => {
   // for Vercel, use environment variables
   return process.env.GOOGLE_PRIVATE_KEY
     ? {
         credentials: {
           client_email: process.env.GCLOUD_SERVICE_ACCOUNT_EMAIL,
           private_key: process.env.GOOGLE_PRIVATE_KEY,
         },
         projectId: process.env.GCP_PROJECT_ID/*.replace(/\\n/g, '\n')*/,
       }
       // for local development, use gcloud CLI
     : {};
 };
 
 // example for Google Cloud Storage
 const gCloudStorage = new Storage(getGCPCredentials());
//  const bucketName = 'my-bucket';
//  const fileName = 'my-file.json';
//  const file = gCloudStorage.bucket(bucketName).file(fileName);
//  await file.save(JSON.stringify({
//    foo: 'bar',
//  }), {
//    contentType: 'application/json',
//  });

// Firestore Functions
const addDataToFirestore = async (data, collection) => {
   try {
      const docRef = firestoreDb.collection(collection).doc();
      // get doc ID
      const res = await docRef.set({
         id: docRef.id,
         ...data
      });
      return docRef.id;
   } catch (e) {
      console.log(e);
      return e;
   }
}

const getFirestoreDocument = async (documentId, collection) => {
   try {
      const docRef = firestoreDb.collection(collection).doc(documentId)
      const doc = await docRef.get();
      if (!doc.exists) {
         console.log('doc doesn\'t exist')
         return false
      } else {
         console.log('data')
         return doc.data()
      }
   } catch (e) {
      console.log('CAUGHT AN ERROR')
      console.log(e);
      return e;
   }
}

exports.firestoreDb = firestoreDb
exports.gCloudStorage = gCloudStorage
exports.addDataToFirestore = addDataToFirestore
exports.getFirestoreDocument = getFirestoreDocument