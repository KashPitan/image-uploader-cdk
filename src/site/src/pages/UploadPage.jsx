import { useState, useEffect } from 'react';
import axios from 'axios';

const UploadPage = () => {
  const [base64Image, setBase64Image] = useState('');
  const [selectedImageName, setSelectedImageName] = useState('');
  const baseUrl = window.env.API_URL;

  const uploadImage = async (e) => {
    try {
      const res = await axios.post(`${baseUrl}images`, {
        image: { contents: base64Image, fileName: selectedImageName },
      });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    console.log(base64Image);
  }, [base64Image]);

  useEffect(() => {
    const fileUploadListener = () => {
      document.getElementById('file-upload').onchange = function (event) {
        var reader = new FileReader();
        reader.readAsDataURL(event.target.files[0]);

        reader.onload = function () {
          var fileContent = reader.result;
          setSelectedImageName(event.target.files[0].name);
          setBase64Image(fileContent);
        };
      };
    };

    window.addEventListener('load', fileUploadListener);

    return () => {
      window.removeEventListener('load', fileUploadListener);
    };
  }, []);

  return (
    <div id="upload-page-container" className="">
      <div>
        <input
          id="file-upload"
          type="file"
          accept=".gif,.jpg,.jpeg,.png"
          className="file:rounded-md file:border-0 file:bg-teal-600 text-lg text-black file:text-white file:p-3 file:px-5 border-2 border-black rounded-lg"
        />
        {base64Image && (
          <button
            onClick={(e) => uploadImage(e)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Upload image
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
