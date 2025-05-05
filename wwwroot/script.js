//Ctrl+F5 if shit is weird

//pdf display
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

const fileInput = document.getElementById('formatfile');
const pdfContainer = document.getElementById('pdfContainer');

let extractedText = ""; //saves text extracted from pdf
let currentRender = 0; //saves which pdf is currently being rendered on screen
let indPDF = []; //saves individual pdfs into an array

let screenUploadBtn = document.getElementById("uploadTitle");
let actualUploadBtn = document.getElementById("uploadBtn");

// Handle the file input change event
fileInput.addEventListener('change', async (event) => {
  const selectedFiles = event.target.files;
  screenUploadBtn.innerHTML = "Loading<div id='loader'></div>";

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    indPDF.push({}); //saves each individual pdf as an object into an array
    indPDF[i].filename = file.name.substring(0, file.name.length - 4); //gets the name of the file without the .pdf extension

    // Wrap FileReader in a Promise
    const pdfData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        resolve(new Uint8Array(e.target.result));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const pdf = await pdfjsLib.getDocument(pdfData).promise; // Use PDF.js to render the PDF
    
    indPDF[i].pdf = pdf;

    //does the text extract stuff
    extractedText += `\n File Name: ${indPDF[i].filename} \n`;
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum); // Wait for the page to be fetched

      // Extract and display text content from the page
      const textContent = await page.getTextContent();
      let text = '';
      textContent.items.forEach(function (item) {
        text += item.str + ' ';
      });

      extractedText += text;
    }
  }

  //sends extracted pdf text to OpenAI API and deals with the consequences
  talkToOpenAI(extractedText).then(response =>{
    let responseJSON = JSON.parse(response); //parses the JSON returned by openai API
    //saves the tags, summaries, and dates into the individual file objects
    for(let i = 0; i < responseJSON.files.length; i++){
      indPDF[i].tags = responseJSON.files[i].tags;
      indPDF[i].summary = responseJSON.files[i].summary;
      const time = new Date();
      const month = String(time.getMonth() + 1).padStart(2, '0'); // pads a zero in the front of the month
      const day = String(time.getDate()).padStart(2, '0');
      const year = time.getFullYear();

      indPDF[i].date = `${month}-${day}-${year}`;
      document.getElementById("downloadCSV").style.display = "initial";
      if(indPDF.length > 1){
        document.getElementById("nextPDF").style.opacity = "1";
        document.getElementById("nextPDF").style.pointerEvents = "auto";
      }
    };

    createSummary(indPDF[0].filename, indPDF[0].tags, indPDF[0].date, indPDF[0].summary);
    renderPDF(indPDF[0].pdf);
    
    screenUploadBtn.innerHTML = "Choose File to Upload";

  });
});

document.getElementById("prevPDF").addEventListener("click", ()=>{
  if(currentRender-1 >= 0){
    currentRender -= 1;
    renderPDF(indPDF[currentRender].pdf);
    createSummary(indPDF[currentRender].filename, indPDF[currentRender].tags, indPDF[currentRender].date, indPDF[currentRender].summary);
    document.getElementById("nextPDF").style.opacity = "1";
    document.getElementById("nextPDF").style.pointerEvents = "auto";
    if(currentRender == 0){
      document.getElementById("prevPDF").style.opacity = "0";
      document.getElementById("prevPDF").style.pointerEvents = "none";
    }
  }

});

document.getElementById("nextPDF").addEventListener("click", ()=>{
  if(currentRender+1 < indPDF.length){
    currentRender += 1;
    renderPDF(indPDF[currentRender].pdf);
    createSummary(indPDF[currentRender].filename, indPDF[currentRender].tags, indPDF[currentRender].date, indPDF[currentRender].summary);
    document.getElementById("prevPDF").style.opacity = "1";
    document.getElementById("prevPDF").style.pointerEvents = "auto";
    if(currentRender == indPDF.length-1){
      document.getElementById("nextPDF").style.opacity = "0";
      document.getElementById("nextPDF").style.pointerEvents = "none";
    }
  }
});

//deals with download csv button
document.getElementById("downloadCSV").addEventListener("click", ()=>{
  let data = [];
  data.push(["File Name", "Tags", "Summary", "Creation Date"]);
  for(let i = 0; i < indPDF.length; i++){
    data.push([indPDF[i].filename, indPDF[i].tags, indPDF[i].summary, indPDF[i].date]);
  }

  const csvContent = data.map(row => row.join(",")).join("\n");

  // Create a Blob from the CSV string
  const blob = new Blob([csvContent], { type: "text/csv" });

  // Create a temporary link to download the Blob
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Free up memory

});


//function to render a pdf on screen
async function renderPDF(pdf){
  pdfContainer.innerHTML = ""; //clears previous contents
  // Loop through each page and render it
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum); // Wait for the page to be fetched

    const scale = window.innerWidth / 1500; // Adjust scale for better visibility
    const viewport = page.getViewport({ scale: scale });

    // Create a canvas element to render the page
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    pdfContainer.appendChild(canvas); // Append the canvas to the container

    const context = canvas.getContext('2d'); // Get the rendering context

    // Render the page on the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    });
  }
}

function createSummary(filename, tags, date, summary){
  let wordList = "";
  for(let i = 0; i < tags.length; i++){
    if(i != 0){
      wordList += ", " + tags[i];
    }
    else{
      wordList += tags[i];
    }
  }

  document.getElementById("name").innerHTML = "<b>File name: </b>" + filename;
  document.getElementById("date").innerHTML = "<b>Upload Date: </b>" + date;
  document.getElementById("keywords").innerHTML = "<b>Keywords: </b>" + wordList;
  document.getElementById("summary").innerHTML = "<b>Summary: </b>" + summary;
}


//AI Stuff
let baseURL = "http://localhost:5000";

if (window.location.hostname !== "localhost") {
  baseURL = "https://openaitag-eda7ath0c2dheyfg.japaneast-01.azurewebsites.net";  // Replace with your actual Azure app URL
}

async function talkToOpenAI(prompt) {
  const response = await fetch(`${baseURL}/openai/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  let json = "";
  //extracts the json from the openai response
  for(let i = 0; i < data.message.length; i++){
    if (data.message.indexOf("{") ==  i){
      json = data.message.substring(i, data.message.lastIndexOf("}") + 1);
    }
  }

  return json;
}