import '@uyun/polyfills';
import '@uyun/runtime';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './src/App';
import './src/styles/global.css';

ReactDOM.render(<App />, document.getElementById('app'));
