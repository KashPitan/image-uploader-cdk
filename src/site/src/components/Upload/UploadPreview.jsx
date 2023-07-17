import React from 'react'

const UploadPreview = ({imgSrc}) => {
  return (
    <>
    {imgSrc ? <img id="upload-preview" src={imgSrc}  alt="upload preview" width="400" height="400" /> : <div> image preview</div>}
    </>
  )
}

export default UploadPreview