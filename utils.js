// Firebase
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const serviceAccount = require("./firebase-service-account-key.json");
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'palate-d1218.appspot.com'
});

const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { Storage } = require("@google-cloud/storage");

const firestoreDb = getFirestore();
const gCloudStorage = new Storage({
   projectId: 'palate-d1218',
   keyFilename: process.env.FIREBASE_APPLICATION_KEY
})

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