var currPos = {
    lat: 41.890,    //41.891
    lng: 12.503     //12.511
};
var indirizzo = "";

var roomexists = "";

function choice() { // controlla se esiste la room
    roomexists = "";
    $(document).ready(function() {
        $.post("/room-exists", {
            roomid: document.URL.split("/")[4].split("#")[0]
        }, function(data) {
            if (data == "1") { // la room esiste e la persona non è nei joinati
                roomexists = "1";
                $('#insPos').show();
                $('#tutorial').hide();
                $('#map').show();
                $('#pac-input').show();
                $('#showCurrentPos').show();
                $("#btnCanc1").show();
                manualPos();
            } else if (data == "2") { //la room esiste e la persona è nei joinati
                roomexists = "1";
                $('#tutorial').hide();
                $('#map').show();
                middle();
            } else{
                roomexists = "0"; //la room non esiste
                $("#inv-button").attr("disabled","disabled");
            }
        }, "text");
    });
}

var map;

function auto() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: currPos,
        zoom: 15
    });
    var infoWindow = new google.maps.InfoWindow({map: map});
    var geocoder = new google.maps.Geocoder;
    var service = new google.maps.places.PlacesService(map);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            currPos = {
                lat: pos.lat,
                lng: pos.lng
            };
            infoWindow.setPosition(pos);
            map.setCenter(pos);
            geocodeLatLng(geocoder, map, infoWindow, pos.lat, pos.lng);
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

function geocodeLatLng(geocoder, map, infowindow, lt, lg) {
    var latlng = {lat: lt, lng: lg};
    geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results[1]) {
                map.setZoom(15);
                var marker = new google.maps.Marker({
                    position: latlng,
                    icon: 'img/markerchick.png',
                    map: map
                });
                infowindow.setContent(results[0].formatted_address);
                indirizzo = results[0].formatted_address;
                $("#pac-input").val(results[0].formatted_address);
                $('#update').click(function(){
                    $("#manual").val(results[0].formatted_address);
                });
                infowindow.open(map, marker);
                marker.setMap(map);
            } else {
                window.alert('No results found');
            }
        } else {
            $(document).ready(function() {
                $("#pac-input").val("");
                $("#update").hide();
            });
        }
    });
}


function manualPos() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: currPos
    });
    var geocoder = new google.maps.Geocoder;
    var infoWindow = new google.maps.InfoWindow();

    /***************** INIZIO Autocomplete *****************/
    map.controls[google.maps.ControlPosition.TOP].push(input);
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(autPos);

    var autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    var infowindow = new google.maps.InfoWindow();
    var marker = new google.maps.Marker({
        map: map,
        anchorPoint: new google.maps.Point(0, -29)
    });

    autocomplete.addListener('place_changed', function() {
        infowindow.close();
        marker.setVisible(false);
        var place = autocomplete.getPlace();
        if (!place.geometry) return;

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            currPos = {
                lat: place.geometry.location.lat(), 
                lng: place.geometry.location.lng()
            }
            map.setZoom(15);
        }
        marker.setIcon(({
            url: 'img/markerchick.png',
            origin: new google.maps.Point(0, 0)
        }));
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        $("#update").show();

        var completeAddress = '' ;
        if (place.address_components) {
            completeAddress = place.formatted_address;
        }

        infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + completeAddress);
        indirizzo = completeAddress;
        infowindow.open(map, marker);
    });

    /***************** FINE Autocomplete *****************/

}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
                          'Error: The Geolocation service failed.' :
                          'Error: Your browser doesn\'t support geolocation.');
}

var roomid = document.URL.split("/")[4].split("#")[0]; //da mandare alla get-coordinates del main
var result = {
    lat: 0.0,
    lng: 0.0
}

function puntoMedio(data) {
    var trovata = 0;
    var res = data.split('"');
    var coordX = [];
    var coordY = [];
    var i;
    for (i=0; i<res.length; i++) {
        if (res[i] == "x" && res[i+2] != "") {
            trovata = 1;
            coordX.push(res[i+2]);
        }
        else if (res[i] == "y" && res[i+1] != "") {
            if (trovata == 1) {
                coordY.push(res[i+2]);
                trovata = 0;
            }
        }
    }
    if(coordX.length == 0 || coordY.length == 0){
        nelleVicinanze(currPos);
    } else {
        for (i=0; i<coordX.length; i++) {
            result.lat += parseFloat(coordX[i]);
            result.lng += parseFloat(coordY[i]);
        }
        result.lat /= coordX.length;
        result.lng /= coordY.length;
        var temp = result;
        nelleVicinanze(temp);
        result = {
            lat: 0,
            lng: 0
        }
    }
}

function nelleVicinanze(posiz) {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16
    });

    cent = new google.maps.LatLng(posiz.lat, posiz.lng);

    if (posiz == currPos) {
        map.setCenter(cent);
    } else {
        var marker = new google.maps.Marker({
            map: map,
            position: cent,
            icon: 'img/markerchick.png'
        });
        map.setCenter(cent);
        infowindow = new google.maps.InfoWindow();
        var service = new google.maps.places.PlacesService(map);
        service.nearbySearch({
            location: cent,
            radius: 300, 
            types: [ 'bar', 'cafe','casino','library','liquor_store','meal_takeaway','meal_delivery',
                    'movie_theater','night_club','park','restaurant', 'shopping_mall', 'spa', 'zoo', 'stadium']
        }, callback);
    }
}

function callback(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) createMarker(results[i]);
        var marker = new google.maps.Marker({
            map: map,
            position: cent,
            icon: 'img/markerchick.png'
        });
    }
}

function createMarker(place) {
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });
    google.maps.event.addListener(marker, 'click', function() {
        if (place.rating != undefined) {
            infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + 
                place.vicinity + '<br>'+ 'Rating: '+place.rating + '</div>');
        } else {
                infowindow.setContent('<div><strong>' + place.name + '</strong><br>' +
                place.vicinity + '</div>');
        }
        infowindow.open(map, this);
    });
}

function middle() {
    $.post("/get-coordinates",{
        roomid: document.URL.split("/")[4].split("#")[0]
    }, function(data) {
        puntoMedio(data);
    }, "text");
}