import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import UploadPage from './pages/UploadPage';
import ViewImagesPage from './pages/ViewImagesPage';

import Navbar from './components/Navbar/Navbar';

import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <UploadPage />,
  },
  {
    path: '/view',
    element: <ViewImagesPage />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Navbar />
    <RouterProvider router={router} />
  </React.StrictMode>
);
