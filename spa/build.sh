#!/bin/bash

######################################
# A script to get the SPA's dependencies
######################################

cd "$(dirname "${BASH_SOURCE[0]}")"
if [ ! -d 'node_modules' ]; then
  npm install
fi

#
# Run code quality checks
#
npm run lint