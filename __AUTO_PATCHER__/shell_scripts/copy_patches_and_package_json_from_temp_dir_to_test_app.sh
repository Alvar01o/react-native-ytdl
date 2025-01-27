#!/bin/sh

# copy patches and package.json to test app directory
cp -r ../../lib/* ../../testapp/node_modules/react-native-ytdl-core/lib/
cp -r ../../package.json ../../testapp/node_modules/react-native-ytdl-core/package.json 