import React, { useEffect, useState } from 'react'
import axios from 'axios';

 const ViewImagesPage = () => {
  const [imageUrls, setImageUrls] = useState([]);
  const baseUrl = window.env.API_URL;
  const cdnUrl = window.env.CDN_URL;

  useEffect(() => {
    (async() => {
      const res = await axios.get(`${baseUrl}images`);
      console.log(res.data.fileNames);
      setImageUrls(res.data.fileNames)
    })();
  }, [])
  
  return (
    <>    
    <div>ViewImagesPage</div>
      {imageUrls.map((url) => 
      <>
        <img src={`${cdnUrl}/images/${url}`} alt="" key={url} width="300" height="300"></img>
        <div>{url}</div>
      </>
            
      )}
    </>
  )
}

export default ViewImagesPage;