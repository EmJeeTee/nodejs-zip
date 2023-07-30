const { app, BrowserWindow, ipcMain,dialog,ipcRenderer} = require('electron')
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const axios = require('axios');
const fse = require('fs-extra');
const semver = require('semver');
const currentVersionPackage  = require('./package.json');
const {autoUpdater} = require('electron-updater');
const { exec } = require('child_process');
const decompress = require("decompress");

/*const tempDir = path.join(__dirname, 'temp'); 

if (fs.existsSync(tempDir)) {
  try {
    fs.unlinkSync(tempDir);
  } catch (error) {
    console.error('Hata:', error);
  }
}

try {
  fs.mkdirSync(tempDir);
} catch (error) {
  if (error.code !== 'EEXIST') {
    console.error('Hata:', error);
    return;
  }
}*/
const tempDir = path.join(__dirname, '..', 'temp'); // Uygulamanın çalıştığı dizinin bir üstündeki "temp" dizini

try {
  fs.mkdirSync(tempDir, { recursive: true });
} catch (error) {
  console.error('Hata:', error);
  return;
}

let fullPath;
let win;
let outputFilePath;
const os = require('os');
const currentVersion = currentVersionPackage.version;


/*async function getVersion() {
  try {
    const response = await axios.get('http://localhost:8080/version');
    const responseName = await axios.get('http://localhost:8080/name');
    const updateVersion = response.data;
    const name = responseName.data;

    console.log(name);
    console.log(updateVersion); 
    console.log(currentVersion);


    if(updateVersion > currentVersion)
    {
      const fs = require('fs');
      const path = require('path');

      dialog.showMessageBox({				
        type: 'info',				
        title: 'Update Available',				
        message: 'A new version is available. Do you want to download it?',				
        buttons: ['Yes', 'No']				
      }).then((result) => {				
        if (result.response === 0) {
          const url = 'http://localhost:8080/update/' + name + ".zip"; 
          console.log(url)
          const fileName = name; 

          let filePath = path.join(tempDir, fileName);
          filePath = filePath + ".zip";
          console.log(filePath);

          const fileStream = fs.createWriteStream(filePath);
          axios.get(url, { responseType: 'stream' })
              .then((response) => {
                response.data.pipe(fileStream);
                fileStream.on('finish', () => {
                  console.log('Dosya indirme tamamlandi');
                });
                fileStream.on('error', (error) => {
                  console.error('Dosya indirme hatasi:', error);
                });
              })
              .catch((error) => {
                console.error('Hata:', error.message); 
                console.error('Hata ayrintilari:', error); 
              });
        }
      }
      );
    } else {
      console.log("No Update.");
    }
  } catch (error) {
    console.error('Hata:', error);
  }
}*/

function openLookFolder(event,msg)
{
    dialog.showOpenDialog({ properties: ['openDirectory'] })
    .then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedFolder = result.filePaths[0];
        fullPath = String(path.resolve(selectedFolder));
        console.log('Secilen Klasor:', selectedFolder);
        console.log('Tam Yol:', fullPath);
        listAll()
      }
    })
    .catch(err => {
      console.log('Klasor secme hatasi:', err);
    });

}


function listAll() {
    const directoryPath = fullPath;
    fs.readdir(directoryPath, function (err, files) {
      if (err) {
        return console.log('Dizin taranamadi: ' + err);
      }
  
      const fileAndFolderList = [];
  
      files.forEach(function (file) {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);
  
        if (stats.isFile()) {
          fileAndFolderList.push({
            name: file,
            type: 'file'
          });
        } 
        else if (stats.isDirectory()) 
        {
          fileAndFolderList.push({
            name: file,
            type: 'folder'
          });
        }
      });
      win.webContents.send('clear');
      win.webContents.send('files', fileAndFolderList);
    });
  }
  

function createWindow () {
    win = new BrowserWindow({
        width: 300,
        height: 600,
        minHeight: 600,
        maxHeight: 600,
        minWidth: 300,
        maxWidth: 300,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
    

    win.loadFile('index.html')
  }

					

function takeFileFunction(event, msg) {
    const baseDirectory = fullPath;
    const tempDirectory = path.join(baseDirectory,'temp');
    outputFilePath = path.join(baseDirectory, 'file.zip');
    const output = fs.createWriteStream(outputFilePath);
  
    output.on('close', () => {
      console.log('Zip dosyasi olusturuldu');
      sendZip();

      fse.remove(tempDirectory)
        .then(() => {
          console.log('Gecici dizin basariyla silindi');
        })
        .catch((err) => {
          console.error('Gecici dizin silinemedi:', tempDirectory, err);
        });
    });
  
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    archive.pipe(output);
  
    let processedCount = 0;
  
    function processFile(file) {
        const filePath = path.join(baseDirectory, file);
      
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error('Dosya veya klasor bulunamadi: ', filePath, err);
            return;
          }
      
          if (stats.isFile()) {
            fs.readFile(filePath, (err, data) => {
              if (err) {
                console.error('Dosya okunamadi: ', filePath, err);
                return;
              }
      
              const relativePath = path.basename(file);
              archive.append(data, { name: relativePath });
              processedCount++;
      
              if (processedCount === msg.length) {
                archive.finalize();
              }
            });
          } else if (stats.isDirectory()) {
            const tempFolderPath = path.join(tempDirectory, file);
      
            fs.mkdir(tempFolderPath, { recursive: true }, (err) => {
              if (err) {
                console.error('Klasor kopyalanamadi: ', filePath, err);
                return;
              }
      
              fs.readdir(filePath, (err, files) => {
                if (err) {
                  console.error('Klasor okunamadi: ', filePath, err);
                  return;
                }
      
                files.forEach((subFile) => {
                  const subFilePath = path.join(filePath, subFile);
                  const subFileTempPath = path.join(tempFolderPath, subFile);
      
                  fs.copyFileSync(subFilePath, subFileTempPath);
                });
      
                archive.directory(tempFolderPath, file);
      
                processedCount++;
      
                if (processedCount === msg.length) {
                  archive.finalize();
                }
              });
            });
          }
        });
      }
      
  
    fs.mkdir(tempDirectory, { recursive: true }, (err) => {
      if (err) {
        console.error('Gecici dizin olusturulamadi: ', tempDirectory, err);
        return;
      }
  
      msg.forEach((file) => {
        processFile(file);
      });
    });


  }

  function takeUpdateMessage(event,msg)
  {
    let message = `Current Version ${app.getVersion()}`
    win.webContents.send('update',message);
  }

  /*function unzip()
  {
    let server;
    fs.readFile(`:/Users/staj_metin.topcuoglu/AppData/Local/electron_app/runner/temp/package.json`, (err, data) => {
      if (err) throw err;
      server = JSON.parse(data);
      console.log(server.data);
    });
  
    decompress("C:/Users/staj_metin.topcuoglu/AppData/Local/electron_app/runner/temp/electron-app.zip", `app-${server.data.version}`)
    .then((files) => {
      console.log(files);
    })
    .catch((error) => {
      console.log(error);
    });

    console.log("Unzip yapildi");
  }*/

  process.on('uncaughtException', (error) => {
    handleErrors(error);
  });
  
  function handleErrors(error) {
    const errorMessage = error.stack || error.toString();
    ipcMain.once('launcher-error', (event) => {
      event.returnValue = errorMessage;
    });
    app.quit();
  }

app.whenReady().then(() => {
    createWindow();
    ipcMain.on('takeFile', takeFileFunction)
    ipcMain.on('lookFolder',openLookFolder)
    ipcMain.on('updateMessage',takeUpdateMessage)
    win.webContents.on('ready-to-show', () => {
    })


})

/*app.on('ready', () => {
});*/

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});


async function sendZip()
{
  const FormData = require('form-data')
			let f = new FormData()
			f.append('defPort', "AAA");
			f.append('checkInSystem', "AEA_ELECTRON");
			f.append('computerName', "stajyer_MetinTOPCUOGLU");
			f.append('messageType', 'ElectronZip');
			f.append('file', fs.createReadStream(outputFilePath));

      const zipUrl = "https://vte-stage.crane.aero/peripherallog";
			console.log('Uploading files to', zipUrl)

			await require("axios")({
				method: 'post',
				url: zipUrl,
				data: f,
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
				headers: {
					...f.getHeaders()
				}
			}).then(response => {
				console.log('Server Upload Process Response: ', response.data)
			}).catch(error => {
				console.log('Error while uploading logs to server!', error)
			})
}

