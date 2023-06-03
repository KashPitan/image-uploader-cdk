import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [base64Image, setBase64Image] = useState("")

  const uploadImage = (e) => {
    console.log('e ', e);

    console.log(base64Image);
    // 1. set image path
    // 2. convert image to base 64
    // 3. Make API call to gateway with image path

    // TODO make api call to upload image
    // TODO set image path. Give it to the API call (to gateway, need API url for) once converted from base 64.
  }

  useEffect(() => {
    const fileUploadListener = () => { 
      document.getElementById("file-upload").onchange = function(event) { 
        var reader = new FileReader(); 
        reader.readAsDataURL(event.srcElement.files[0]); 
        reader.onload = function () { 
          var fileContent = reader.result; 
          console.log(fileContent); 
          setBase64Image(fileContent);
        } 
    }}
    
    window.addEventListener("load", fileUploadListener); 
  
    return () => {
      window.removeEventListener("load", fileUploadListener);
    }
  }, []);
   
  return (
    <div className="App">
      <div>
        <input id="file-upload" type="file" accept=".gif,.jpg,.jpeg,.png" /> 
        {/* <button onClick={(e) => getImagePath(e)}>Select image</button> */}
        {base64Image && (
          <button onClick={(e) => uploadImage(e)}>Upload image</button>
        )}
      </div>
    </div>
  );
}

export default App;
