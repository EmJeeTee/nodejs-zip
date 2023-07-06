const { app, BrowserWindow, ipcMain,dialog} = require('electron')
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const axios = require('axios');
const fse = require('fs-extra');

let fullPath;
let win;
let outputFilePath;
const os = require('os');


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
      console.log('Klasör seçme hatası:', err);
    });

}


function listAll() {
    const directoryPath = fullPath;
    fs.readdir(directoryPath, function (err, files) {
      if (err) {
        return console.log('Dizin taranamadı: ' + err);
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


app.whenReady().then(() => {
    createWindow()
    ipcMain.on('takeFile', takeFileFunction)
    ipcMain.on('lookFolder',openLookFolder)
    win.webContents.on('ready-to-show', () => {
    })


})

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

