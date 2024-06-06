require("dotenv").config();
const mongoose = require('mongoose');
const { Octokit } = require('@octokit/rest');
const cron = require('node-cron'); 

const MONGO_URL = process.env.DB;
const GIT_TOKEN = process.env.TOKEN;
const GIT_REPO = 'spicybirsge/backups';

async function backup() {
  console.log(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}: Starting backup`);
  await mongoose.connect(MONGO_URL);

  const backupName = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); 

  const collections = await mongoose.connection.db.listCollections().toArray();

  for (const collectionInfo of collections) {
    const collectionName = collectionInfo.name;

    // Use the MongoDB driver to fetch data directly from the collection
    const collectionData = await mongoose.connection.db.collection(collectionName).find().toArray();

    const dump = collectionData;
   

    const backupJSON = Buffer.from(JSON.stringify(dump)).toString('base64');

    const octokit = new Octokit({ auth: GIT_TOKEN });

    await octokit.repos.createOrUpdateFileContents({
      owner: GIT_REPO.split('/')[0], 
      repo: GIT_REPO.split('/')[1],
      path: `backups/${mongoose.connection.name}/${collectionName}/${backupName}_${collectionName}.json`,
      message: `Backup ${backupName} - ${collectionName}`,  
      content: backupJSON
    });

    console.log(`${backupName}: successfully backed up ${collectionName}`);
  }

  console.log(`${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')}: Backup completed!`);

  mongoose.connection.close();
}

backup().then(() => {
 
  cron.schedule('*/30 * * * *', backup);
});
