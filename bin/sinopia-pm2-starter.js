#!/usr/bin/env node

const when = require( 'when' );
const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const pm2 = require('pm2');
const ERROR_EXIT = 1;
const syncExec = require('sync-exec');
const pkg = require('../package.json');
const program = require('commander');
//const SUCCESS_EXIT = 0;
//const DEVELOPMENT = true;
const processName = "sinopia";
require('ansi-escape-string');

const ROOT_PATH = path.resolve(process.env.HOME, '.sinopia-pm2-starter');
const SERVER_INFO_PATH = path.resolve( ROOT_PATH, 'serverInfo.json');
const PROTOCOL_REGEXP = /^https?:\/\//;

//
// find global sinopia
//
const result =	syncExec('which sinopia');
const scriptPath = result.stdout.replace(/\n$/,'');
if( ! scriptPath ) {
	console.log("sinopia must be installed as globally. To install, type 'npm install -g sinopia'".red() );
	process.exit( ERROR_EXIT );
}

//
// find global pm2
//
// todo: use global pm2
/*
var globalPm2Path;
(function() {
	var res = syncExec('which pm2');
	var maybeSymlinkPath = ( res.stdout || '' ).replace( /\n$/,'' );
	if( maybeSymlinkPath ) {
		globalPm2Path = readlinkSync( maybeSymlinkPath );
	}

	if( globalPm2Path && ! /$\//.test( globalPm2Path ) ) {

		globalPm2Path = path.join( path.dirname(maybeSymlinkPath), globalPm2Path);

	} else if( globalPm2Path ) {

	} else {

	}

}());
*/

const defaultServerInfo = {
	proxyAddress: "",
	host: "http://localhost",
	port: 4873
};
var serverInfo;
try {
	serverInfo = require( SERVER_INFO_PATH );
} catch( err ) {
	console.log('No config file');
	console.log("If you want to use your serverInfo, sinopia-pm2-starter --help".yellow() );
	serverInfo = {};
}

_.each( serverInfo, function( val, key ) {
	if( ! val ) delete serverInfo[ key ];
});
serverInfo = _.extend( {}, defaultServerInfo, serverInfo );

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
  console.log('');
  console.log('    Set a your dnsEver.com id and secret code');
  console.log('    $ dnsever-ddns-updater id wonbin32');
  console.log('    $ dnsever-ddns-updater auth_code oiwj32olkd');
  console.log('');
  console.log('    Show all informatino');
  console.log('    $ dnsever-ddns-updater show');
  console.log('');
  console.log('    More information in https://github.com/b6pzeusbc54tvhw5jgpyw8pwz2x6gs/sinopia-pm2-starter');
  console.log('');
});

program.command('start')
.description('Start sinopia server')
.action(function() {
	pm2Connect().then( function() {
		return pm2Start();
	}).then( function() {
		pm2.disconnect();
	});
});

program.command('restart')
.description('Restart sinopia server')
.action(function() {
	pm2Connect().then( function() {
		return pm2Delete();
	}).then( function() {
		return pm2Start();
	}).then( function() {
		pm2.disconnect();
	});
});

program.command('stop')
.description('Stop sinopia server')
.action(function() {
	pm2Connect().then( function() {
		return pm2Delete();
	}).then( function() {
		pm2.disconnect();
	});
});

/*
// todo: !
program.command('log')
.description('Monitor logs of the sinopia server');
.action(function() {

	spawn( globalPm2Path, ['logs', pm2script.name, '--raw'], { stdio: stdioOption });
});
*/

program.command('config')
.alias('config:list')
.description('Show all serverInfo')
.action(function() {
	console.log( serverInfo );
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
		console.log('Wrong port'.red() );
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


var pm2script = {
	name: processName,
	log_date_format: "YYYY-MM-DD HH:mm Z",
	script: scriptPath,
	args: ["--listen", serverInfo.host+':'+serverInfo.port ],

	//"instances": 1, //or 0 => 'max'
	min_uptime: "10s", // defaults to 15
	max_restarts: 3, // defaults to 15

	error_file: path.join( process.env.HOME,'.pm2','logs', processName+'.log' ),
	out_file: path.join( process.env.HOME,'.pm2','logs', processName+'.log' ),

	merge_logs: true,

	// Default environment variables that will be injected in any environment and at any start
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

function pm2Connect() {
	var deferred = when.defer();
	//console.log('pm2.connect()');
	pm2.connect( function( err ) {

		if (err) {
			deferred.reject( err );
			return;
		}
		deferred.resolve();
	});
	return deferred.promise;
}

function pm2Delete() {
	var deferred = when.defer();
	//console.log('pm2 delete '+processName);
	pm2.delete( processName, function( err, proc ) {

		if( err ) {
			deferred.reject( err );
			return;
		}
		deferred.resolve();
	});
	return deferred.promise;
}

function pm2Start() {

	console.log('sinopia path: ' + scriptPath );
	console.log('node version: ' + process.version );
	if( process.version !== "0.12.7" ) {
		console.log('node version is not "0.12.7"'.yellow() );
	}

	var deferred = when.defer();
	//console.log('pm2 start');
	pm2.start( pm2script, function( err, apps ) {
			 
		if( err ) {
			deferred.reject( err );
			return;
		}
		deferred.resolve();

		const registryAddress = serverInfo.host + (serverInfo.port ? ":"+serverInfo.port : "" );
		const green = "'npm config set registry " + registryAddress + "'";
		console.log("In the client side, To access this registry, type "+ green.green() );
		console.log("If you want to see logs, type "+"'sinopia-pm2-starter logs'".green() );
	});
	return deferred.promise;
}

function save( data ) {
	const msg = 'Saved server information to '+ SERVER_INFO_PATH;
	var contents = JSON.stringify( data );
	fs.writeFileSync( SERVER_INFO_PATH, contents );
	console.log( contents );
	console.log( msg.green() );
}

if (process.argv.length == 2) {

	console.log( '' );
	console.log('  -h, --help     output usage information'.yellow() );
	console.log( '' );
}
