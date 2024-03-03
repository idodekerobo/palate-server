// Firebase
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { GoogleAuth, auth } = require('google-auth-library');

// firebase
initializeApp({
  credential: cert({
    type: process.env.FB_CERT_CREDENTIAL_TYPE,
    project_id: process.env.GCP_PROJECT_ID,
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

const { getFirestore, FieldValue /*Timestamp, Filter */ } = require('firebase-admin/firestore');
const { Storage } = require("@google-cloud/storage");

const firestoreDb = getFirestore();

// const credentials = JSON.parse(Buffer.from(process.env.GCLOUD_CREDENTIALS, 'base64').toString('utf-8'));
// const auth = new GoogleAuth({credentials});

// const client = auth.fromJSON(Buffer.from(process.env.GCLOUD_CREDENTIALS, 'base64').toString('utf-8'))
// const client = auth.fromJSON(process.env.GCLOUD_JSON_CREDENTIALS)
// console.log(process.env.GCLOUD_JSON_CREDENTIALS)
// client.scopes = ['https://www.googleapis.com/auth/cloud-platform'];

// const getGCPCredentials = () => {
//    // for heroku, use environment variables
//    return process.env.GCLOUD_CREDENTIALS
//      ? {
//          credentials: credentials,
//          projectId: process.env.GCP_PROJECT_ID
//        }
//        // for local development, use gcloud CLI
//      : {};
//  };
//  const gCloudStorage = new Storage(getGCPCredentials());

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

/*
documentId - String of id of Firebase Firestore document to update
collection - String of collection name in Firebase Firestore
data - key value pair of name of property to update and value to update it too. i.e., { email: newUserEmail@gmail.com}
*/
const updateFirestoreDocument = async (documentId, collection, data) => {
   try {
      const docRef = firestoreDb.collection(collection).doc(documentId)
      const response = await docRef.update(data)
      return response
   } catch (e) {
      console.log("CAUGHT AN ERROR UPDATING FIRESTORE DOCUMENT", e)
      return e
   }
}

// palateId is an array of strings
const addPalateToFirestoreUser = async (userId, newPalateIdArr) => {
   try {
      const docRef = firestoreDb.collection("users").doc(userId)
      // console.log(docRef);
      // console.log(userId);
      // console.log(newPalateIdArr)
      const response = await docRef.update({
         palates: FieldValue.arrayUnion(...newPalateIdArr)
      });
      return response
   } catch (e) {
      console.log("CAUGHT AN ERROR ADDING PALATES TO FIRESTORE USER OBJECT", e)
      return e
   }
}

exports.firestoreDb = firestoreDb
// exports.gCloudStorage = gCloudStorage
exports.addDataToFirestore = addDataToFirestore
exports.getFirestoreDocument = getFirestoreDocument
exports.updateFirestoreDocument = updateFirestoreDocument
exports.addPalateToFirestoreUser = addPalateToFirestoreUser