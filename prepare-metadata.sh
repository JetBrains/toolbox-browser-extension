#!/bin/bash

set -e -x -u

printenv CHROME_EXTENSION_PEM_BASE64 | tr -d '\r' | base64 -d > extension.pem

sed -i "s/\"version\": \"1.0\"/\"version\": \"$BUILD_NUMBER\"/g" manifest.json


