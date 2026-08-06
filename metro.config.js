// metro.config.js — SpendZen production Metro bundler configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drop all console.* calls from the production bundle (saves KB, reduces parse time)
config.transformer = {
    ...config.transformer,
    minifierConfig: {
        compress: {
            drop_console: true,
        },
    },
};

module.exports = config;
