import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [base64Image, setBase64Image] = useState("");
  const baseUrl = window.env.API_URL;

  const uploadImage = async (e) => {
    // console.log('e ', e);
    console.log(baseUrl);
    try {
      const res = await axios.post(`${baseUrl}upload-image`, {image: base64Image});
      console.log(res);
    }catch(error){
      console.log(error);
    }

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
