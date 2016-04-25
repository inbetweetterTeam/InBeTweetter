
var express = require('express');

//NPM Module to integrate Handlerbars UI template engine with Express
var exphbs  = require('express-handlebars');

//NPM Module to make HTTP Requests
var request = require("request");

//NPM Module To parse the Query String and to build a Query String
var qs = require("querystring");

var app = express();

//Declaring Express to use Handlerbars template engine with main.handlebars as
//the default layout
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(express.static(__dirname + '/public'));

//URL To obtain Request Token from Twitter
var requestTokenUrl = "https://api.twitter.com/oauth/request_token";

//To be obtained from the app created on Twitter
var CONSUMER_KEY = "";
var CONSUMER_SECRET = "";

//Oauth Object to be used to obtain Request token from Twitter
var oauth = {
  callback : "http://localhost:3000/signin-with-twitter",
  consumer_key  : CONSUMER_KEY,
  consumer_secret : CONSUMER_SECRET
}
var oauthToken = "";
var oauthTokenSecret = "";
app.get('/', function (req, res) {
  //Step-1 Obtaining a request token
  request.post({url : requestTokenUrl, oauth : oauth}, function (e, r, body){

    //Parsing the Query String containing the oauth_token and oauth_secret.
    var reqData = qs.parse(body);
    oauthToken = reqData.oauth_token;
    oauthTokenSecret = reqData.oauth_token_secret;

    //Step-2 Redirecting the user by creating a link
    //and allowing the user to click the link
    var uri = 'https://api.twitter.com/oauth/authenticate'
    + '?' + qs.stringify({oauth_token: oauthToken})
    res.render('home', {url : uri});
  });

});

//Callback to handle post authentication.
app.get("/signin-with-twitter", function(req, res){
  var authReqData = req.query;
  oauth.token = authReqData.oauth_token;
  oauth.token_secret = oauthTokenSecret;
  oauth.verifier = authReqData.oauth_verifier;

  var accessTokenUrl = "https://api.twitter.com/oauth/access_token";
  //Step-3 Converting the request token to an access token
  request.post({url : accessTokenUrl , oauth : oauth}, function(e, r, body){
    var authenticatedData = qs.parse(body);
    console.log(authenticatedData);

   

    var authenticationData = {
      consumer_key : CONSUMER_KEY,
      consumer_secret : CONSUMER_SECRET,
      token: authenticatedData.oauth_token,
      token_secret : authenticatedData.oauth_token_secret
    };


    //Check how many try you have left
    var limitUrl = "https://api.twitter.com/1.1/application/rate_limit_status.json" + "?" +
        + "resources=help,users,search,statuses";
    request.get({url:limitUrl, oauth: authenticationData, json:true}, function(e,r,body){
      for(i in body){
        console.log(body[i]['friends'])
      }
    });

    //Retrieve FriendsList 
    var name = [];
    var urlFriends = "https://api.twitter.com/1.1/friends/list.json" + "?" +
        + qs.stringify({screen_name: authenticatedData.screen_name}) + "&count=100";
	request.get({url : urlFriends, oauth: authenticationData, json:true}, function getData(e, r, body){
	    var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
            + qs.stringify({text: authenticatedData.screen_name + "Prova Bottone"});
	    for(i in body){
	      	for(j in body[i]){
		        var tweetObj = body[i][j];
		        if(tweetObj.name != undefined){
		        	name.push({text:tweetObj.name, photo: tweetObj.profile_image_url, tag: tweetObj.screen_name, urs: messUrl});
			    }
		    }
	    }
	    
	    if(body['next_cursor'] > 0){
	      request.get({url : urlFriends+ "&cursor=" + body['next_cursor'], oauth: authenticationData, json:true},getData)
	  	}else{
	  		var viewData={
		      username: authenticatedData.screen_name,
		      oauth: authenticationData,
		      name: name
		    };
	    	res.render("my", viewData);
	  	}
	}); 

	
    //SEND DIRECT MESSAGE
    /*var messUrl = "https://api.twitter.com/1.1/direct_messages/new.json" + "?"
                  + qs.stringify({text:"@sender ti ha invitato alla stanza: www.twitter.com", screen_name: "@receiver"});
    request.post({url: messUrl, oauth: authenticationData, json:true});*/
    


    /*//GET 10 latest tweets
    ///Make a request to get User's 10 latest tweets
    var apiUrl = "https://api.twitter.com/1.1/statuses/user_timeline.json" + "?"
      + qs.stringify({screen_name: authenticatedData.screen_name, count: 10});
    
    request.get({url : apiUrl, oauth: authenticationData, json:true}, function(e, r, body){

      var tweets = [];
      for(i in body){
        var tweetObj = body[i];
        tweets.push({text: tweetObj.text});
      }

      var viewData = {
        username: authenticatedData.screen_name,
        tweets: tweets
      };

      res.render("my", viewData);

    });*/ //END

  });
});

app.listen(3000, function(){
  console.log('Server up: http://localhost:3000');
});
