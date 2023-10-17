var WebSocket = require('faye-websocket');
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.bind('9999');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var builder = new xml2js.Builder();
const nconf = require('nconf');
nconf.file("config.json");

// UDP Server

socket.on('listening', function () {
	socket.setBroadcast(true);
});

function connect() {
  
  var client = new WebSocket.Client('ws://192.168.100.202/Interfaces/Media/JackpotsGateway?COMPUTERNAME=Floor');

  // Websocket server stuff

  client.on('error', function(message) {
    console.log("Error connecting to websocket .... " + message)
  });

  client.on('open', function(message) {
    console.log('Connection established to websocket!');
  });

  client.on('message', function(message) {
    readXML(message.data);
  });

  client.on('close', function(message) {
    console.log('Connection closed!', message.code, message.reason);
    
    // reconnect to server on disconnect and retry every 5 seconds...
    setTimeout(function() {
      connect();
    }, 5000);
  });
}

// function that creates the "XML" to send to CNario
function createxml(obj, type) {

  if (type == 0) {

    var str = '<MMC><Jackpot JackpotNumber = "' + obj.$.Id + '" JackpotName = "' + obj.$.Name + '"><Level Name = "Level 0" Number = "0" Amount = "' + obj.$.Value + '"/></Jackpot></MMC>';
    return str
  } else {

    var str='<MMC><Jackpot JackpotNumber = "' + obj.Jackpot[0].$.Id + '" JackpotName = "' + obj.Jackpot[0].$.Name + '"><Level Name = "Level 0" Number = "0" Amount = "' + obj.Jackpot[0].$.Value + '"><Hit Amount = "' + obj.Hit[0].Amount[0] + '" Number = "' + obj.Hit[0].Machine[0].$.MachineNumber + '" Name = "Fever" Text = "Congratulations"/></Level></Jackpot></MMC>';
    return str

  }
}

//function for looking up jackpots by id from the config file
function lookupConf(jackpots, id) {
  for (i in jackpots) {
    if (jackpots[i].id == id) return jackpots[i];
  }
}

// function for reading the incomming messages and process the data accordingly
function readXML(msg) {
  
  jackpots = nconf.get("jackpots");

  parser.parseString(msg, function (err, result) {
    
    try {
      
      if ("JackpotHit" in result) {
        
        console.log("New Jackpot hit...")
        newhit = result.JackpotHit
        jpconf = lookupConf(jackpots, newhit.Jackpot[0].$.Id)
        xmlvb = createxml(newhit, 1);
        socket.send(xmlvb, 0, xmlvb.length, jpconf.port, jpconf.address);
      }

      if ("InformationBroadcast" in result) {

        jps = result.InformationBroadcast.JackpotList[0].Jackpot
        jps.forEach(jp => {
          if (hitsdb.indexOf(jp.$.Id) == -1) {
            jpconf = lookupConf(jackpots, jp.$.Id)
            xmlvb = createxml(jp, 0);
            socket.send(xmlvb, 0, xmlvb.length, jpconf.port, jpconf.address);
          }
        })
      }

    } catch(error) {
        console.log("Error in xml message : " + error)
    }

  });
}

// connect to the websocket...

connect();