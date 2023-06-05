import { useState, useEffect } from 'react';
import axios from 'axios';

const UploadPage = () => {
  const [base64Image, setBase64Image] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  const baseUrl = window.env.API_URL;

  const uploadImage = async (e) => {
    try {
      const res = await axios.post(`${baseUrl}images`, {image: {contents: base64Image, fileName: selectedImageName}});
      console.log(res);
    }catch(error){
      console.log(error);
    }
  }

  useEffect(() => {
    const fileUploadListener = () => { 
      document.getElementById("file-upload").onchange = function(event) { 
        var reader = new FileReader(); 
        reader.readAsDataURL(event.target.files[0]); 

        reader.onload = function () { 
          var fileContent = reader.result; 
          setSelectedImageName(event.target.files[0].name);
          setBase64Image(fileContent);
        } 
    }}
    
    window.addEventListener("load", fileUploadListener); 
  
    return () => {
      window.removeEventListener("load", fileUploadListener);
    }
  }, []);
   
  return (
    <div>
        <input id="file-upload" type="file" accept=".gif,.jpg,.jpeg,.png" /> 
        {base64Image && (
            <button onClick={(e) => uploadImage(e)}>Upload image</button>
        )}
    </div>
  );
}

export default UploadPage;
