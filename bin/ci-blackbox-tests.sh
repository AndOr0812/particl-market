#!/bin/sh
wait-port localhost:3100
npm run test:black-box:pretty
