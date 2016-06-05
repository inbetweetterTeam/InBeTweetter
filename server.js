var express = require('express');
//NPM Module to integrate Handlerbars UI template engine with Express
var exphbs  = require('express-handlebars');
var handlebars = require('handlebars');
//NPM Module to make HTTP Requests
var request = require("request");
var path = require('path');
//NPM Module To parse the Query String and to build a Query String
var qs = require("querystring");
//NPM Module for the DB
var Firebase = require("firebase");
//NPM Module for parsing body and cookie handling
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

//NPM Module for generating random id for rooms
var shortid = require('shortid');

var port = Number(process.env.PORT || 3000);

var app = express();


//Link to the DB
var Persone = new Firebase('https://amber-heat-2218.firebaseio.com/persone');
var Stanze = new Firebase('https://amber-heat-2218.firebaseio.com/stanze');


//Declaring Express to use Handlerbars template engine with main.handlebars as
//the default layout
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(cookieParser());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

//URL To obtain Request Token from Twitter
var requestTokenUrl = "https://api.twitter.com/oauth/request_token";

//To be obtained from the app created on Twitter
var CONSUMER_KEY = "";
var CONSUMER_SECRET = "";
var authenticationData = {
    consumer_key: '',
    consumer_secret: '',
    token: '',
    token_secret: '',
    screen_name: '',
    name: ''
};
//Oauth Object to be used to obtain Request token from Twitter
var oauth = {
    callback: "https://inbetweetter.herokuapp.com/callback",
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET
}

var oauthToken = "";
var oauthTokenSecret = "";

app.get('/', function (req, res) {
    //Step-1 Obtaining a request token
    var oauth1 = {
        callback: "https://inbetweetter.herokuapp.com/callback",
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET
    }
    if (req.cookies['ibt'] != null) {
        var ref = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']);
        ref.once("value",function(s) {
            var a = s.exists();
            if (a == true) {
                //se il cookie esiste già
                res.redirect("/room"); //redirect to the creation room
            }
        });
    } else {
        request.post({url: requestTokenUrl, oauth: oauth1}, function(e, r, body) {
          //Parsing the Query String containing the oauth_token and oauth_secret.
          var reqData = qs.parse(body);
          oauthToken = reqData.oauth_token;
          oauthTokenSecret = reqData.oauth_token_secret;
          //Step-2 Redirecting the user by creating a link
          //and allowing the user to click the link
          var uri = 'https://api.twitter.com/oauth/authenticate'
            + '?' + qs.stringify({oauth_token: oauthToken});

          res.render('landing', {url: uri});
        });
    }
});

//Callback to handle post authentication.
app.get("/callback", function(req,res) {
    var authReqData = req.query;
    oauth.token = authReqData.oauth_token;
    oauth.token_secret = oauthTokenSecret;
    oauth.verifier = authReqData.oauth_verifier;

    var accessTokenUrl = "https://api.twitter.com/oauth/access_token";
    //Step-3 Converting the request token to an access token
    request.post({url: accessTokenUrl , oauth: oauth}, function(e, r, body) {
        var authenticatedData = qs.parse(body);
        console.log(authenticatedData);

        authenticationData = {
            consumer_key: CONSUMER_KEY,
            consumer_secret: CONSUMER_SECRET,
            token: authenticatedData.oauth_token,
            token_secret: authenticatedData.oauth_token_secret,
            screen_name: authenticatedData.screen_name,
            name: '',
            photo: ''
        };
        res.cookie("ibt", authenticatedData.user_id);
        var esiste = 0;
        Persone.once("value", function(s) {
            s.forEach(function(d) {
                if (d.key()== authenticatedData.user_id) {
                    esiste = 1;
                };
            });
        });
        var infoUser = "https://api.twitter.com/1.1/users/show.json?" + "screen_name=" + authenticatedData.screen_name;
        request.get({url: infoUser, oauth: authenticationData, json: true}, function(e, r, body) {
            authenticationData.name = body['name'];
            authenticationData.photo = body['profile_image_url']
            var Data = {
                authData: authenticationData,
                room: ""
            }
            if (esiste == 0) Persone.child(authenticatedData.user_id).set(Data);
        });

		var hasRoom = req.cookies['room'];
        setTimeout(function(){
	        if (hasRoom != null) {
	            res.redirect("/room/" + hasRoom);
	        } else {
	            res.redirect("/room");
	        }
        }, 800);
    });
});

app.get("/room", function(req,res) {
    //controllo del database se esiste
    res.redirect("/room/"+shortid.generate());
});

app.get("/room/:roomid", function(req,res) {
    var room = req.params.roomid;
    var hasCookie = req.cookies['ibt'];
    var stanza = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+room);
    if (hasCookie == null) {
        res.cookie("room", room);
        res.redirect('/');
    } else {
        var Pers = new Firebase('https://amber-heat-2218.firebaseio.com/persone');
        Pers.once("value",function(e){
            if(e.hasChild(hasCookie)){
                var invitato = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+room+'/invitati/'+hasCookie);
                var joinati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+room+'/joinati');
                var roomPers = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+hasCookie+'/room');
                var Pers = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+hasCookie);

                stanza.once("value", function(l){
                    if(l.exists()){
                        //la persona corrente deve passare da invitati a joinati
                        invitato.once("value", function(s) {
                            if(s.exists()){
                                invitato.remove();
                                joinati.once("value", function(j){
                                    if(!j.hasChild(hasCookie)){
                                        Pers.once("value", function(info){
                                            var h = info.val();
                                            for(i in h){
                                                if(i == "authData"){
                                                    joinati.child(hasCookie).set({
                                                        name: h[i]['name'],
                                                        photo: h[i]['photo'],
                                                        x: "",
                                                        y: ""
                                                    });
                                                }
                                            }
                                        });
                                    }
                                });
                                roomPers.once("value", function(r) {
                                    if(!r.hasChild(room)){
                                        var n = l.val();
                                        for(i in n){
                                            if(i == "data"){
                                                roomPers.child(room).set({
                                                    name: n[i]['name']
                                                });
                                            }
                                        }
                                    }
                                });
                                res.clearCookie("room");
                                Persone.orderByKey().on('child_added',function(s) {
                                    if (s.key() == req.cookies['ibt']) {
                                        s.forEach(function(d) {
                                            if (d.key() == "authData") {
                                                authenticationData = d.val();
                                                var name = [];
                                                var urlFriends = "https://api.twitter.com/1.1/friends/list.json?" +
                                                    + qs.stringify({screen_name: authenticationData.screen_name}) + "&count=100";
                                                request.get({url: urlFriends, oauth: authenticationData, json: true}, function getData(e, r, body) {
                                                    for (i in body) {
                                                        for (j in body[i]) {
                                                            var tweetObj = body[i][j];
                                                            if (tweetObj.name != undefined) {
                                                                name.push({text: tweetObj.name, photo: tweetObj.profile_image_url, tag: tweetObj.screen_name, user_id: tweetObj.id_str});
                                                            }
                                                        }
                                                    }
                                                    if (body['next_cursor'] > 0) {
                                                        request.get({url: urlFriends+ "&cursor=" + body['next_cursor'], oauth: authenticationData, json: true}, getData);
                                                    } else {
                                                        var roomPerson = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']+'/room');
                                                        var personRoom = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+room);
                                                        roomPerson.once("value", function(s) {
                                                            var t = s.val();
                                                            var rooms = [];
                                                            for (i in t) {
                                                                if (i != room) {
                                                                    rooms.push({id: i, name: t[i]['name']})
                                                                }
                                                            }
                                                            personRoom.once("value", function(f) {
                                                                var p = f.val();
                                                                f.forEach(function(info){
                                                                    if(info.key() == "data"){
                                                                        var dat = info.val();
                                                                        f.forEach(function(inf){
                                                                            if(inf.key() == "joinati"){
                                                                                var addr = inf.val();
                                                                                var persData = [];
                                                                                for(i in addr){
                                                                                    persData.push({name: addr[i]['name'], photo: addr[i]['photo']});
                                                                                }
                                                                                for(j in addr){
                                                                                    if(j == req.cookies['ibt']){
                                                                                        var viewData = {
                                                                                            name: name,
                                                                                            rooms: rooms,
                                                                                            roomName: dat['name'],
                                                                                            roomTime: dat['time_date'],
                                                                                            persData: persData
                                                                                        };
                                                                                        res.render("roomCreated", viewData);
                                                                                    }
                                                                                }
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            });
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }else{
                                joinati.once("value", function(j){
                                    if(j.hasChild(hasCookie)){
                                        Persone.orderByKey().on('child_added',function(s) {
                                            if (s.key() == req.cookies['ibt']) {
                                                s.forEach(function(d) {
                                                    if (d.key() == "authData") {
                                                        authenticationData = d.val();
                                                        var name = [];
                                                        var urlFriends = "https://api.twitter.com/1.1/friends/list.json?" +
                                                            + qs.stringify({screen_name: authenticationData.screen_name}) + "&count=100";
                                                        request.get({url: urlFriends, oauth: authenticationData, json: true}, function getData(e, r, body) {
                                                            for (i in body) {
                                                                for (j in body[i]) {
                                                                    var tweetObj = body[i][j];
                                                                    if (tweetObj.name != undefined) {
                                                                        name.push({text: tweetObj.name, photo: tweetObj.profile_image_url, tag: tweetObj.screen_name, user_id: tweetObj.id_str});
                                                                    }
                                                                }
                                                            }
                                                            if (body['next_cursor'] > 0) {
                                                                request.get({url: urlFriends+ "&cursor=" + body['next_cursor'], oauth: authenticationData, json: true}, getData);
                                                            } else {
                                                                var roomPerson = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']+'/room');
                                                                var personRoom = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+room);
                                                                roomPerson.once("value", function(s) {
                                                                    var t = s.val();
                                                                    var rooms = [];
                                                                    for (i in t) {
                                                                        if (i != room) {
                                                                            rooms.push({id: i, name: t[i]['name']})
                                                                        }
                                                                    }
                                                                    personRoom.once("value", function(f) {
                                                                        var p = f.val();
                                                                        f.forEach(function(info){
                                                                            if(info.key() == "data"){
                                                                                var dat = info.val();
                                                                                f.forEach(function(inf){
                                                                                    if(inf.key() == "joinati"){
                                                                                        var addr = inf.val();
                                                                                        var persData = [];
                                                                                        for(i in addr){
                                                                                            persData.push({name: addr[i]['name'], photo: addr[i]['photo']});
                                                                                        }
                                                                                        for(j in addr){
                                                                                            if(j == req.cookies['ibt']){
                                                                                                var viewData = {
                                                                                                    name: name,
                                                                                                    rooms: rooms,
                                                                                                    roomName: dat['name'],
                                                                                                    roomTime: dat['time_date'],
                                                                                                    persData: persData,
                                                                                                    addr: addr[j]['address']
                                                                                                }
                                                                                                res.render("roomCreated", viewData);
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                });
                                                                            }
                                                                        });
                                                                    });
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }else{
                                        res.redirect("/room");
                                    }
                                });
                            }
                        });
                    }else{
                        //EasterEGG: You can personalize your RoomID
                        Persone.orderByKey().on('child_added',function(s){
                            if(s.key() == req.cookies['ibt']){
                                s.forEach(function(d){
                                    if(d.key() == "authData"){
                                        authenticationData = d.val();
                                        var name = [];
                                        var urlFriends = "https://api.twitter.com/1.1/friends/list.json?" +
                                          + qs.stringify({screen_name: authenticationData.screen_name}) + "&count=100";
                                        request.get({url : urlFriends, oauth: authenticationData, json:true}, function getData(e, r, body){
                                            for(i in body){
                                                for(j in body[i]){
                                                    var tweetObj = body[i][j];
                                                    if(tweetObj.name != undefined){
                                                        name.push({text:tweetObj.name, photo: tweetObj.profile_image_url, tag: tweetObj.screen_name, user_id: tweetObj.id_str});
                                                    }
                                                }
                                            }
                                            if(body['next_cursor'] > 0){
                                                request.get({url : urlFriends+ "&cursor=" + body['next_cursor'], oauth: authenticationData, json:true},getData)
                                            }else{
                                                var roomPerson = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']+'/room');
                                                roomPerson.once("value", function(s) {
                                                    var t = s.val();
                                                    var rooms = [];
                                                    for (i in t) {
                                                        if (i != room) {
                                                            rooms.push({id: i, name: t[i]['name']})
                                                        }
                                                    }
                                                    var viewData={
                                                        name: name,
                                                        rooms: rooms
                                                    };
                                                    res.render("roomCreation",viewData);
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }else{
                res.redirect("/logout");
            }
        });
    }
});

app.post("/send-message", function(req,res) {
	var tag = req.body.tag;
    var userid = req.body.userid;
	var room = req.headers.referer;
	var ref = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+req.body.roomid+'/invitati');
	ref.child(userid).set("");
	Persone.orderByKey().on('child_added',function(s) {
        if (s.key() == req.cookies['ibt']) {
            s.forEach(function(d){
                if (d.key() == "authData") {
                    authenticationData = d.val();
                    var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
                                  + qs.stringify({text: "I invite you to the event:  " + room, screen_name: tag});
                    request.post({url: messUrl, oauth: authenticationData, json:true});
                }
            });
        }
    });
});


app.get("/about", function(req,res){
    if(req.cookies['ibt'] != null){
        var roomPerson = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']+'/room');
        roomPerson.once("value", function(s) {
            var t = s.val();
            var rooms = [];
            for (i in t) {
                rooms.push({id: i, name: t[i]['name']})
            }
            var viewData ={
                rooms: rooms
            }
            res.render("about",viewData);
        });
    }else{
        res.sendFile(path.join(__dirname, "/views","about.html"));
    }

});

app.post("/send-notifications", function(req,res){
    var time_date = req.body.time_date;
    var room_name = req.body.room_name;
    var room = req.headers.referer;
    if(time_date != undefined){
        var roomid = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+req.body.roomid+'/joinati');
        Persone.orderByKey().on('child_added',function(s) {
            if (s.key() == req.cookies['ibt']) {
                s.forEach(function(d){
                    if (d.key() == "authData") {
                        authenticationData = d.val();
                        roomid.once("value", function(p){
                            var pers = p.val();
                            var people= [];
                            for(i in pers){
                                if(i != req.cookies['ibt']){
                                    people.push({id: i});
                                }
                            }
                            for(i in people){
                                var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
                                      + qs.stringify({text: "I changed the meeting time-date in the event:  " + room, user_id: people[i]['id']});
                                request.post({url: messUrl, oauth: authenticationData, json:true});
                            }
                        });
                    }
                });
            }
        });
    }else if(room_name != undefined){
        var roomid = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+req.body.roomid+'/joinati');
        Persone.orderByKey().on('child_added',function(s) {
            if (s.key() == req.cookies['ibt']) {
                s.forEach(function(d){
                    if (d.key() == "authData") {
                        authenticationData = d.val();
                        roomid.once("value", function(p){
                            var pers = p.val();
                            var people= [];
                            for(i in pers){
                                if(i != req.cookies['ibt']){
                                    people.push({id: i});
                                }
                            }
                            for(i in people){
                                var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
                                      + qs.stringify({text: "I changed the name of the event:  " + room, user_id: people[i]['id']});
                                request.post({url: messUrl, oauth: authenticationData, json:true});
                            }
                        });
                    }
                });
            }
        });
    }
});

app.post("/create-room", function(req,res){
    //Save room to database
    var roomid = req.body.roomid;
    var room = req.body.room;
    var ref = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid);
    ref.once("value",function(s){
        var a = s.exists();
        if (a == true) {
            var nomeS = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/data');
            nomeS.update({
                name: room
            });
            var invitatiS = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/invitati');
            var joinatiS = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
            invitatiS.once("value", function(s){
                s.forEach(function(d){
                    var nome = d.key();
                    var temp = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+nome+'/room');
                    temp.once("value", function(sn) {
                        sn.forEach(function(ds) {
                            if (ds.key() == roomid) {
                                var temp = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+nomeS+'/room/'+roomid);
                                temp.update({
                                    name: room
                                });
                            }
                        });
                    });
                });
            });
            joinatiS.once("value", function(s) {
                s.forEach(function(d){
                    var nomeS = d.key();
                    var temp = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+nomeS+'/room');
                    temp.once("value", function(sn){
                        sn.forEach(function(ds){
                            if (ds.key() == roomid){
                                var temp = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+nomeS+'/room/'+roomid);
                                temp.update({
                                    name: room
                                });
                            }
                        });
                    });
                });
            });
        } else {
            var r = {
                data: {
                    name: room,
                    time_date: "",
                    id_room: roomid
                },
                joinati: ""
            };
            Stanze.child(roomid).set(r);
            var s = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
            var nome = req.cookies['ibt'];
            var Pers = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']);
            Pers.once("value",function(p){
                var data = p.val();
                for(i in data){
                    if(i == "authData"){
                        s.child(nome).set({
                            name: data[i]['name'],
                            photo: data[i]['photo'],
                            x: "",
                            y: ""
                        });
                    }
                }
            });
            //Add the room to the creator
            var p = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+nome+'/room');
            p.child(roomid).set({
                name: room
            });
        };
    });
});

app.post("/set-time", function(req,res){
    var ref = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+req.body.roomid+'/data');
    ref.update({
        time_date: req.body.time_date
    });
});

app.post("/send-coordinates", function(req, res) {
    var currPos = req.body.position;
    var roomid = req.body.roomid;
    var addr = req.body.addr;
    var lat = currPos['lat'];
    var lng = currPos['lng'];
    //controllare se esistono già le coordinate nella persona corrente nella stanza corrente
    var ref = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati/'+req.cookies['ibt']);

    ref.update({
        x: lat,
        y: lng,
        address: addr
    });
});

app.post("/get-coordinates", function(req,res){
    var roomid = req.body.roomid;
    var ref = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
    var coordX = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati/'+req.cookies['ibt']+'/x');
    var coordY = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati/'+req.cookies['ibt']+'/y');
    ref.once("value", function(s) {
        coordX.once("value", function(s1) {
            coordY.once("value", function(s2) {
                var data = s.val();
                res.send(data);
            });
        });
    });
});

app.post("/room-exists", function(req, res) {
    var found = "0";
    var roomid = req.body.roomid;
    var rooms = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/');
    rooms.once("value", function(r) {
        if (r.hasChild(roomid)) {
            found = "1";
            var joinati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
            joinati.once("value", function(j){
                if (j.hasChild(req.cookies['ibt'])) {
                    if (j.child(req.cookies['ibt']).child("x").val() != "" && j.child(req.cookies['ibt']).child("y").val() != ""){

                    }
                    found = "2";
                    res.send(found);
                } else res.send(found);
            });
        } else res.send(found);
    });
});

app.get("/logout", function(req,res){
    res.clearCookie("ibt");
    console.log("Logout succeded.");
    res.redirect("/");
});

app.get("/leave-room",function(req,res){
    var url = req.headers.referer;
    var roomid = url.split("/")[4];

    //Delete this person from the room
    var room = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+req.cookies['ibt']+"/room/"+roomid);
    var joinati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
    room.remove();
    var count = 0;
    joinati.once("value", function(d){ // non funziona
        d.forEach(function(p){
            if(p.key() == req.cookies['ibt']){
                var person = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati/'+p.key());
                person.remove();
                joinati.once("value", function(n){
                    if (!n.hasChildren()) {
                        var invitati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/invitati');
                        invitati.once("value", function(i) {
                            if (!i.hasChildren()) {
                                var thisRoom = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid);
                                thisRoom.remove();
                            }
                        });
                    }
                });
            }
        });
    });
    res.redirect("/room");
});

/*app.get("/delete-account", function(req,res){

});*/

/*******************************  ROUTES FOR OUR API  *******************************/

var router = express.Router(); // get an instance of the express Router


// test route to make sure everything is working (accessed at GET http://localhost:3000/api)
router.get('/', function(req, res) {
    res.json({ message: 'Welcome to the InBeTweetter API.' });
});

// all of our routes will be prefixed with /api
app.use('/api', router);

router.route('/rooms')

    // Get all the user’s rooms
    .get(function(req, res) {
        if (req.query.userid == "" || req.query.userid == null) res.json({ message: 'Attention: you cannot use our service without your Twitter ID.'});
        else {
            var userid = req.query.userid;
            var ref = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid);
            ref.once("value", function(s){
                if (s.exists()) {
                    var rooms = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid+'/room');
                    rooms.once("value", function(s){
                        var t = s.val();
                        res.json({"Your rooms": t});
                    });
                } else res.json({ message: 'Attention: you must log in before using our service.'});
            });
        }
    })

    // Create a new room
    .post(function(req, res) {
        if (req.query.userid == "" || req.query.userid == null) res.json({ message: 'Attention: you cannot use our service without your Twitter ID.'});
        else if (req.query.roomname == "" || req.query.roomname == null)
            res.json({ message: 'Error: You must provide a roomid and a roomname.'});
        else if (req.query.lat == "" || req.query.lat == null || req.query.lng == null || req.query.lng == "")
            res.json({ message: 'Attention: you forgot the latitude (lat)/longitude (lng) parameter.'});
        else {
            var userid = req.query.userid;
            var roomid = shortid.generate();
            var roomname = req.query.roomname;
            var lat = req.query.lat;
            var lng = req.query.lng;
            var ref1 = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid);
            ref1.once("value", function(user){
                if (user.exists()) {
                    var ref = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid);
                    ref.once("value", function(room){
                        if (room.exists()) res.json({ message: 'The roomid you sent already exists! Try with another one.' });
                        else {
                            Stanze.child(roomid).set({
                                data: {
                                    id_room: roomid,
                                    name: roomname,
                                    time_date: ""
                                },
                                joinati: ""
                            });
                            //aggiungo il creatore ai joinati, con relativa lat e long
                            var joinati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
                            joinati.child(userid).set({
                                address: "",
                                name: "",
                                photo: "",
                                x: lat,
                                y: lng
                            });
                            //aggiungo la room al creatore
                            var creatore = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid+'/room');
                            creatore.child(roomid).set({
                                name: roomname
                            });
                            res.json({message: "Room created with the id: " + roomid});
                        }
                    });
                } else res.json({ message: 'Attention: you must log in on our site to use this service.'});
            });
        }
    });

router.route('/rooms/:roomid')

    // Get all the invited people of a specific room
    .get(function(req, res) {
        if (req.query.userid == "" || req.query.userid == null) res.json({ message: 'Attention: you cannot use our service without your Twitter ID.'});
        else if (req.params.roomid == "" || req.params.roomid == null) res.json({ message: 'Error: You must provide a roomid.'});
        else if (req.query.people == "" || req.query.people == null || (req.query.people != "invited" && req.query.people != "joined")) res.json({ message: 'Error: You must choose between "invited" and "joined".'});
        else {
            var roomid = req.params.roomid;
            var people = req.query.people;
            var userid = req.query.userid;
            var ref = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid);
            ref.once("value", function(user){
                if (user.exists()) {
                    var ref1 = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid);
                    ref1.once("value", function(room){
                        if (room.exists()) {
                            var ref2 = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid+'/room/'+roomid);
                            ref2.once("value", function(inroom){
                              if (inroom.exists()) {
                                  if (people == "invited") {
                                      var invitati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/invitati');
                                      invitati.once("value", function(s){
                                          var t = s.val();
                                          var u = [];
                                          for (var i in t){
                                              u.push(i);
                                          }
                                          res.json({"Invited friends": u});
                                      });
                                  } else {
                                      var joinati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
                                      joinati.once("value", function(s){
                                          var t = s.val();
                                          var u = [];
                                          for (var i in t){
                                              u.push(i);
                                          }
                                          res.json({"Joined friends": u});
                                      });
                                  }
                              } else res.json({ message: "Error: You can't access this room."});
                            });
                        } else res.json({ message: "Error: The room you entered doesn't exist."});
                    });
                } else res.json({ message: 'Attention: you must log in before using our service.'});
            });
        }
    })

    // Invite a friend to the room
    .put(function(req, res) {
        if (req.query.userid == "" || req.query.userid == null) res.json({ message: 'Attention: you cannot use our service without your Twitter ID.'});
        else if (req.params.roomid == "" || req.params.roomid == null) res.json({ message: 'Error: You must provide a roomid.'});
        else if (req.query.friendid == "" || req.query.friendid == null) res.json({ message: 'Error: You must provide a Twitter ID.'});
        else {
            var userid = req.query.userid;
            var roomid = req.params.roomid;
            var friendid = req.query.friendid;
            var ref = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid);
            ref.once("value", function(user){
                if (user.exists()) {
                    var ref1 = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid);
                    ref1.once("value", function(room){
                        if (room.exists()) {
                            var ref2 = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid+'/room/'+roomid);
                            ref2.once("value", function(inroom){
                                if (inroom.exists()) {
                                    var ref3 = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/invitati');
                                    ref3.child(friendid).set("");
                                    ref.once("value", function(campo){
                                        var data;
                                        var authenticationData = campo.val();
                                        for (var i in authenticationData){
                                            if (i == "authData") data = authenticationData[i];
                                        }
                                        var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
                                                + qs.stringify({text: "ti ha invitato alla stanza: https://inbetweetter.herokuapp.com/room/" + roomid, user_id: friendid});
                                        request.post({url: messUrl, oauth: data, json:true});
                                        res.json({message: "Invited!"});
                                    });
                              } else res.json({ message: "Error: You can't access this room."});
                          });
                        } else res.json({ message: "Error: The room you entered doesn't exist."});
                    });
                } else res.json({ message: 'Attention: you must log in before using our service.'});
            });
        }
    })

    // Exit the room
    .delete(function(req, res) {
        if (req.query.userid == "" || req.query.userid == null) res.json({ message: 'Attention: you cannot use our service without your Twitter ID.'});
        else if (req.params.roomid == "" || req.params.roomid == null) res.json({ message: 'Error: You must provide a roomid.'});
        else {
            var userid = req.query.userid;
            var roomid = req.params.roomid;
            var ref = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid);
            ref.once("value", function(user){
                if (user.exists()) {
                    var ref1 = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid);
                    ref1.once("value", function(room){
                        if (room.exists()) {
                            var ref2 = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+userid+'/room/'+roomid);
                            ref2.once("value", function(inroom){
                                if (inroom.exists()) {
                                    delUsersRoom(roomid, userid);
                                    var invitati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/invitati/'+userid);
                                    var joinati = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati/'+userid);
                                    var ref3 = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/invitati');
                                    var ref4 = new Firebase('https://amber-heat-2218.firebaseio.com/stanze/'+roomid+'/joinati');
                                    var trovato = 0;
                                    invitati.once("value", function(inv){
                                        if (inv.exists()) {
                                            trovato = 1;
                                            invitati.set(null);
                                            if (trovato == 1) res.json({ message: 'You left the room.'});
                                        } else {
                                            joinati.once("value", function(j){
                                                if (j.exists()){
                                                    trovato = 1;
                                                    joinati.set(null);
                                                    if (trovato == 1) res.json({ message: 'You left the room.'});
                                                } else res.json({ message: 'Error: You already left the room.'});
                                            });
                                        }
                                    });
                                    ref3.once("value", function(s){
                                        var a = s.numChildren();
                                        if (a == 0) {
                                            ref4.once("value", function(t){
                                                var b = t.numChildren();
                                                if (b == 0) {
                                                    ref1.set(null);
                                                }
                                            });
                                        }
                                    });
                              } else res.json({ message: "Error: You can't access this room."});
                          });
                        } else res.json({ message: "Error: The room you entered doesn't exist."});
                    });
                } else res.json({ message: 'Attention: you must log in before using our service.'});
            });
        }
    })

/********************* FUNZIONI AUSILIARIE *********************/

function delUsersRoom(id_room, id_person) {
    var ref = new Firebase('https://amber-heat-2218.firebaseio.com/persone/'+id_person+'/room/'+id_room);
    ref.once("value", function(s){
        if (s.exists()) ref.set(null);
    });
}

app.listen(port, function(){
    console.log('Server up: http://localhost:3000');
});
