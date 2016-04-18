var express = require('express');
var request = require("request");
var data = require('social_signin.js');
var app = express();

var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
                  + qs.stringify({text: "ti ha invitato alla stanza: www.twitter.com"});
var sendMessage = request.post({url: messUrl, oauth: data.authenticationData, json:true});