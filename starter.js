const _ = require('underscore');
const path = require('path');
const pm2 = require('pm2');
const ERROR_EXIT = 1;
const syncExec = require('sync-exec');
const argv = require('yargs').argv;
//const SUCCESS_EXIT = 0;
//const DEVELOPMENT = true;
const processName = "sinopia";
require('ansi-escape-string');

const proxyAddress = "";	// input yours
const host = "";			// input yours

console.log('node version: ' + process.version );
if( process.version === "0.12.7" ) {
	console.log('node version is not "0.12.7"'.red() );
}

const result =	syncExec('which sinopia');
const scriptPath = result.stdout.replace(/\n$/,'');
console.log('sinopia path: ' + scriptPath );

var pm2script = {
	name: processName,
	log_date_format: "YYYY-MM-DD HH:mm Z",
	script: scriptPath,
	args: ["--listen", host ],

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

if( proxyAddress ) {

	pm2script.env.http_proxy = proxyAddress;
	pm2script.env.https_proxy = proxyAddress;
}

pm2.connect( function( err ) {

	if (err) {

		console.error( err );
		process.exit( ERROR_EXIT );
	}

	if( argv.restart ) {

		console.log('delete');
		pm2.delete( processName, function( error, proc ) {

			if( error ) {
				console.error( error );
				process.exit( ERROR_EXIT );
			}
			start();
		});

	} else {
		start();
	}
});

function start() {
	console.log('start');
	pm2.start( pm2script, function( error, apps ) {
			 
		if( error ) {
			console.error( error );
			process.exit( ERROR_EXIT );
		}

		console.log('start success'.green() );
		pm2.disconnect();
	});
}

_.each( pm2script.env, function( val, key ) {

	if( typeof val === 'string' ) return;

	// parse test
	try{
		JSON.parse( val );
	} catch( err ) {
		console.error( err );
	}
});
