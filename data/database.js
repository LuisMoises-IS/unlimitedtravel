const mongodb = require('mongodb');

const MongoClient = mongodb.MongoClient;

let mongodbUrl = 'mongodb://localhost:27017';

if(process.env.MONGODB_URL){
  mongodbUrl = process.env.MONGODB_URL;
}

let database;

async function connectToDatabase() {
  const client = await MongoClient.connect(
    mongodbUrl
  );
  database = client.db('auth-demo');
}

function getDb() {
  if (!database) {
    throw { message: 'Base de datos no conectada' };
  }
  return database;
}

module.exports = {
  connectToDatabase: connectToDatabase,
  getDb: getDb,
};
