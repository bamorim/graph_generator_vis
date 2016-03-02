#!/bin/sh
inliner index.html -m > compiled.html
scp compiled.html icarai:/home/bamorim/public_html/generator/index.html
rm compiled.html
