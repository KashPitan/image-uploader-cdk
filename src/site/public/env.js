import config from './config.json' assert { type: "json" };

// add all values from config to window object to be used in app
window.env = {};
for (const property in config) {
    console.log(`${property}: ${config[property]}`);
    window.env[`${property}`] = config[property];
}