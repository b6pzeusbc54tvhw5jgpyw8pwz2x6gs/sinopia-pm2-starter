# sinopia-pm2-starter
sinopia starter using pm2

[![npm version](https://img.shields.io/npm/v/sinopia-pm2-starter.svg?style=flat-square)](https://www.npmjs.com/package/sinopia-pm2-starter)



## pre install ( If pm2 or sinopia is not installed )
```
$ npm install -g pm2
$ npm install -g sinopia
```

## install
```
$ npm install -g sinopia-pm2-starter
```

## usage
```
$ sinopia-pm2-starter config:host '123.123.123.123'
$ sinopia-pm2-starter config:port '3020'
$ sinopia-pm2-starter start

// in the client side
$ npm config set registry http://123.123.123.123:3020
```

## pm2
It's nice process manager!
I hope you use pm2 globally and know pm2 basic command at least.
If you have a global pm2, type a following to show process status, logs.
```
$ pm2 logs sinopia
$ pm2 list
```
