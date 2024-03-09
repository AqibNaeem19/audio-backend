let express = require('express');
const app = express();
var bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
let cors = require('cors');
const cron = require('node-cron');


app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
app.use(bodyParser.json({ limit: "200mb" }));


function execShellCommand(cmd) {
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
}

app.get("/", (req, res) => {
  res.json({ status: "SUCCESS", message: "Hello how are you" })
})

app.get("/apple", (req, res) => {
  res.json({ status: "SUCCESS", message: "Hello how are you apple" })
})

app.post("/convert-audio", async (req, res) => {
  try {
    let base64OfM4aFile = req.body.getM4aBase64;
    let base64OfWavFile;
    let randomNumber = Math.floor(Math.random() * 10000);
    console.log('Base received of m4a');

    // Convert base64 back to audiofile and save it.
    fs.writeFileSync(`clientAudio${randomNumber}.mpeg`,
      Buffer.from(base64OfM4aFile.replace("data:audio/mpeg;base64,", ""), "base64")
    );

    // Running shell command to convert the file into wav
    console.log('Executing Shell ffmpeg command', new Date());
    await execShellCommand(`ffmpeg -i clientAudio${randomNumber}.mpeg -f wav -bitexact -ac 1 -ar 16000 -acodec pcm_s16le serverAudio${randomNumber}.wav`);

    // Convertig wav file into base64
    fs.readFile(`./serverAudio${randomNumber}.wav`, async (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log('converting the fs into base64 string', new Date());
      base64OfWavFile = result.toString("base64");

      // Object to send to CLE Server
      const myObj = {
        file: base64OfWavFile,
        token: "30795ce7-73c9-4363-a3da-26ee18178e41",
        lang: "ur",
        srate: "16000"
      }

      // Send the POST request to the server
      const URL = "api.cle.org.pk";
      const postURL = "https://" + URL + "/v1/asr";

      // Sending request
      console.log('Sending request to CLE API', new Date());
      const sendRequest = await fetch(postURL, {
        method: "POST",
        headers: {
          "Content-type": "application/json ;odata=verbose",
        },
        body: JSON.stringify(myObj)
      });

      // Transforming response
      console.log('Converting response to json', new Date());
      const response = await sendRequest.json();
      console.log('This the json object here', response);


      res.send(response);

      console.log('Ressponse is sent back', new Date());

    });
  } catch (error) {
    console.log(error);
  }
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is listening to port ${process.env.PORT}`);
})


const folderPath = process.cwd();
console.log(folderPath);


// Schedule the cron job to run every 30 seconds
cron.schedule('*/30 * * * * *', () => {
  console.log('Running cron job...');

  // Read the contents of the folder
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Failed to read folder:', err);
      return;
    }

    // Filter files that start with "server" or "client" using regular expression
    const filesToDelete = files.filter(file => /^(server|client)/.test(file));

    // Delete each file in the array
    filesToDelete.forEach(file => {
      fs.unlink(path.join(folderPath, file), err => {
        if (err) {
          console.error(`Failed to delete file ${file}:`, err);
        } else {
          console.log(`Deleted file: ${file}`);
        }
      });
    });
  });
});