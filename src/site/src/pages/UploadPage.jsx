import { useState, useEffect } from 'react';
import axios from 'axios';
import UploadPreview from '../components/Upload/UploadPreview';

const UploadPage = () => {
  const [base64Image, setBase64Image] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState('');
  const [uploadResult, setUploadResult] = useState('');


  const baseUrl = window.env.API_URL;

  const uploadImage = async (e) => {
    try {
      const res = await axios.post(`${baseUrl}images`, {
        image: { contents: base64Image, fileName: selectedImageName },
      });
      console.log(res);
      if(res.status === 200){
        setUploadResult('success');
      }else{
        setUploadResult('failure');
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const fileUploadListener = () => {
      document.getElementById('file-upload').onchange = function (event) {

        let reader = new FileReader();
        const files = event.target.files[0];
        reader.readAsDataURL(files);

        reader.onload = function () {
          var fileContent = reader.result;
          setSelectedImageName(files.name);
          setBase64Image(fileContent);
        };
      };
    };

    window.addEventListener('load', fileUploadListener);

    return () => {
      window.removeEventListener('load', fileUploadListener);
    };
  }, []);

  // const resultComponent = () => {
  //   return <></>
  // };

  return (
    <div id="upload-page-container" className="">
      <div>
        <UploadPreview imgSrc={base64Image}/>
        <input
          id="file-upload"
          type="file"
          accept=".gif,.jpg,.jpeg,.png,.svg"
          className="file:rounded-md file:border-0 file:bg-teal-600 text-lg text-black file:text-white file:p-3 file:px-5 border-2 border-black rounded-lg"
        />
          <button
            onClick={(e) => uploadImage(e)}
            disabled={!base64Image}
            className="rounded-md bg-indigo-600 px-3.5 pys-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-500"
          >
            Upload image
          </button>
      </div>
    </div>
  );
};

export default UploadPage;
