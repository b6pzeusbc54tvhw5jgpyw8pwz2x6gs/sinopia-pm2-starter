#!/usr/bin/env node

const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const ERROR_EXIT = 1;
const syncExec = require('sync-exec');
const pkg = require('../package.json');
const program = require('commander');
//const SUCCESS_EXIT = 0;
//const DEVELOPMENT = true;
const processName = "sinopia";
const colors = require('colors');
colors.enabled = true;

const ROOT_PATH = path.resolve(process.env.HOME, '.sinopia-pm2-starter');
const SERVER_INFO_PATH = path.resolve( ROOT_PATH, 'serverInfo.json');
const PROCESS_JSON = path.resolve( ROOT_PATH, '_process.json' );
const PROTOCOL_REGEXP = /^https?:\/\//;

var serverInfo;
try {
	serverInfo = require( SERVER_INFO_PATH );
} catch( err ) {
	console.log('No config file');
	console.log("If you want to use your serverInfo, sinopia-pm2-starter --help".yellow );
	serverInfo = {};
}

_.each( serverInfo, function( val, key ) {
	if( ! val ) delete serverInfo[ key ];
});

const defaultServerInfo = {
	proxyAddress: "",
	host: "http://localhost",
	port: 4873
};
serverInfo = _.extend( {}, defaultServerInfo, serverInfo );


//
// find node, pm2, sinopia paths
//
const NODE = serverInfo.nodePath || process.execPath;
const PM2 = (function() {

	if( serverInfo.pm2Path ) {

		return serverInfo.pm2Path;

	} else {

		var res = syncExec('which pm2');
		return ( res.stdout || '' ).replace( /\n$/,'' );
	}
}());
const SINOPIA = ( function() {

	if( serverInfo.sinopiaPath ) {
		return serverInfo.sinopiaPath;
	} else {
		const result = syncExec('which sinopia');
		return result.stdout.replace(/\n$/,'');
	}
}());

console.log( 'nodejs path: ', NODE.green );
console.log( 'pm2 path: ', PM2.green );
console.log( 'sinopia path: ', SINOPIA.green );
if( ! NODE || ! PM2 || ! SINOPIA ) {
	console.log("pm2 and sinopia paths must be set or installed globally".red );
	console.log("Install command: npm install -g pm2 sinopia'".red );
	process.exit( ERROR_EXIT );
}

// ready DIR
(function() {
  if (!fs.existsSync( ROOT_PATH )) {
    fs.mkdirSync( ROOT_PATH );
  }

  if (process.stdout._handle && process.stdout._handle.setBlocking)
    process.stdout._handle.setBlocking(true);
}());

// command line

program
.version(pkg.version)
.usage('[command]');

program.on('--help', function() {
  console.log('  Basic Examples:');
  console.log('    sinopia-pm2-starter config:host sinopia.mycompany.com');
  console.log('    sinopia-pm2-starter config:port 433');
  console.log('    sinopia-pm2-starter config:proxy http://my.proxy.address:port');
  console.log('    sinopia-pm2-starter config');
  console.log('    sinopia-pm2-starter start');
});

program.command('start')
.description('Start sinopia server')
.action(function() {
	start();
});

program.command('restart')
.description('Restart sinopia server')
.action(function() {
	exec([ PM2, 'delete', processName ]);
	start();
});

program.command('stop')
.description('Stop sinopia server')
.action(function() {
	exec([ PM2, 'delete', processName ]);
});

program.command('logs')
.description('Monitor logs of the sinopia server')
.action(function() {
	exec([ PM2, 'logs', processName ]);
});

program.command('config')
.alias('config:list')
.description('Show all serverInfo')
.action(function() {
	console.log( JSON.stringify( serverInfo, null, 2 ) );
});

program.command('config:pm2 <pm2_absolute_path>')
.description('Set pm2 path')
.action(function( pm2Path ) {

	serverInfo.pm2Path = pm2Path;
	save( serverInfo );
});

program.command('config:host <hostAddress>')
.description('Set server host')
.action(function( hostAddress ) {

	if( ! PROTOCOL_REGEXP.test( hostAddress ) && hostAddress ) {
		hostAddress = "http://" + hostAddress;
	}
	serverInfo.host = hostAddress;
	save( serverInfo );
});

program.command('config:port <port>')
.description('Set server host')
.action(function( port ) {
	if( ! port ) {
		console.log('Wrong port'.red );
		process.exit( ERROR_EXIT );
	}
	serverInfo.port = port;
	save( serverInfo );
});

program.command('config:proxy <proxy_address>')
.description('Set server proxy if server in proxy')
.action(function( proxyAddress ) {
	if( ! proxyAddress ) {
		proxyAddress = "";
	}
	serverInfo.proxyAddress = proxyAddress;
	save( serverInfo );
});

program.parse(process.argv);

function getPm2Script() {
	var pm2script = {
		name: processName,
		log_date_format: "YYYY-MM-DD HH:mm Z",
		script: SINOPIA,
		args: ["--listen", serverInfo.host+':'+serverInfo.port ],

		//"instances": 1, //or 0 => 'max'
		min_uptime: "10s", // defaults to 15
		max_restarts: 3, // defaults to 15

		error_file: path.join( process.env.HOME,'.pm2','logs', processName+'.log' ),
		out_file: path.join( process.env.HOME,'.pm2','logs', processName+'.log' ),

		merge_logs: true,

		env: {
			//"NODE_TLS_REJECT_UNAUTHORIZED": "0"
		}
	};

	if( serverInfo.proxyAddress ) {
		pm2script.env.http_proxy = serverInfo.proxyAddress;
		pm2script.env.https_proxy = serverInfo.proxyAddress;
	}
	_.each( pm2script.env, function( val ) { 

		if( typeof val === 'string' ) return;

		// parse test
		try{
			JSON.parse( val );
		} catch( err ) {
			console.error( err );
		}
	});

	return pm2script;
}

function start() {

	const pm2Script = getPm2Script();
	const contents = JSON.stringify( pm2Script, null, 2 );
	console.log( pm2Script );
	fs.writeFileSync( PROCESS_JSON, contents, 'utf8' );

	exec([ PM2, 'start', PROCESS_JSON ]);


	const registryAddress = serverInfo.host+(serverInfo.port ? ":"+serverInfo.port : "" );
	const greenStr = "'npm config set registry " + registryAddress + "'";
	console.log("In the client side, Set this registry: "+ greenStr.green );
	console.log("sinopia log: " + "'sinopia-pm2-starter logs'".green );
}

function save( data ) {
	const msg = 'Saved server information to '+ SERVER_INFO_PATH;
	var contents = JSON.stringify( data );
	fs.writeFileSync( SERVER_INFO_PATH, contents );
	console.log( contents );
	console.log( msg.green );
}

function exec( cmd ) {

	const execOptions = { stdio: [ process.stdin, process.stdout, process.stderr ] };
	cmd = _.isArray( cmd ) ? cmd.join(' ') : cmd;

	syncExec( cmd, execOptions );
}

if (process.argv.length == 2) {

	console.log( '' );
	console.log('  -h, --help     output usage information'.yellow );
	console.log( '' );
}
