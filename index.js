/**
 * @format
 */
// index.js
import './shim'; // Use shim.js instead of globals.js
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);