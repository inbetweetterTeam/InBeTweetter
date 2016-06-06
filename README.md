# InBeTweetter

####What is InBeTweetter?

InBeTweetter is the best way to meet your friends and loved ones. Thanks to an algorithm we created, we can suggest you the meeting location that is the nearest to the position of every invited person. An easier way to plan your hangouts.


####How does it work?

When you login for the first time you get redirected to a new Room. From there you can invite your Twitter friends to join the Room. The map will automatically update the suggested meeting location while people join.


####How do I join a Room?

Someone has to invite you to join the Room. The invitation is delivered via Twitter direct message.


####More details about InBeTweetter

We try to deliver a flawless experience of use through a simple and minimalistic material design using MaterializeCSS. We make use of Twitter OAuth API to ensure your data is always safe and Google Maps API to give you the most up to date informations about places around you.

https://inbetweetter.herokuapp.com/

https://www.youtube.com/embed/giZvDd2TpQM



##InBeTweetter APIs

####Routes

	GET /api/rooms		        	Get all the user’s rooms.

 _userid_        Your ID. Attention: you can access ONLY your rooms’ informations.


	POST /api/rooms		        	Create a new room.

_userid_		Your ID. Attention: you can access ONLY your rooms’ informations.

_roomname_	    The name of the event you want to create.

_lat_		    The latitude of your starting position. 

_lng_		    The longitude of your starting position.

	GET /api/rooms/:roomid		    Get all the invited people of a specific room.

_userid_		Your ID. Attention: you can access ONLY your rooms’ informations.

_people_		A boolean value: if _invited_, it will return the invited people who didn’t join the room yet; if _joined_, it will return the people who joined the room.

	PUT /api/rooms/:roomid		    Invite a friend to the room.

_userid_		Your ID. Attention: you can access ONLY your rooms’ informations.

_friendid_	    The ID of a friend you want to invite.

	DELETE /api/rooms/:roomid	    Leave the room.	

_userid_		Your ID. Attention: you can access ONLY your rooms’ informations.
