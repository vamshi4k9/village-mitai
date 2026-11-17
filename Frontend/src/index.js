import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { BrowserRouter } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';

import reportWebVitals from './reportWebVitals';

// mark images as loaded (or failed) so their loading shimmer stops (see index.css)
const markImage = (e) => {
  if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded');
};
document.addEventListener('load', markImage, true);
document.addEventListener('error', markImage, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId="367509210442-mm65jklfj09mg82cs9isttne3je517pq.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>

    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
