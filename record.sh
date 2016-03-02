#!/bin/sh

if [ "$#" -lt 2 ]; then
  echo "usage: record.sh <arglist> <output> [<time>=30]"
  echo ""
  echo "  Where <output> is the output video filename"
  echo "  And <arglist> is some string like ARG1=VAL1&ARG2=VAL2"
  echo "  For example: s=2&speed_0=2&speed_10=50&speed_100=200"
  exit 1;
fi

TIME=$1
URL="http://www.land.ufrj.br/~bamorim/generator/#$1"
phantomjs record.js $URL | ffmpeg -y -c:v png -f image2pipe -r 30 -t ${3:-30}  -i - -c:v libx264 -vf "crop=1024:768:0:0" -pix_fmt yuv420p -movflags +faststart $2
