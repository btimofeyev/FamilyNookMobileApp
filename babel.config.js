// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... any other plugins you have, like react-native-dotenv
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env"
      }],
      //
      'react-native-reanimated/plugin',
    ],
  };
};