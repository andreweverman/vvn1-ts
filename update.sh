pm2 stop vvn1
git reset --hard
git pull
npm i
npm run build
pm2 start vvn1
