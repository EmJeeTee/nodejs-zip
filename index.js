addEventListener("DOMContentLoaded", (event) => {
    document.getElementById('gozatButton').addEventListener('click',() => {
        peripheralAPI.send('lookFolder',"bastim");
        document.getElementById('headerForFiles').style.display = "block";
    })
});

let filesDiv = document.getElementById('files');

peripheralAPI.receive('clear', msg => {
    while (filesDiv.firstChild) {
      filesDiv.removeChild(filesDiv.firstChild);
    }
});

peripheralAPI.receive('files', msg => {

    msg.forEach(file => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = file.name; 
    checkbox.name = file.type === 'folder' ? 'folder' : 'file'; 

    const label = document.createElement('label');
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(file.name));

    filesDiv.appendChild(label);

    filesDiv.appendChild(document.createElement('br'));
  });
});


