$(document).ready(function(){


	//To change tha address
	$('#manual').click(function() {
        if (roomexists == "1"){ // se la stanza esiste
            $("#tutorial").hide();
            $("#tutorialpos").hide();
            $("#map").show();
            $('#btnCanc1').show();
            $('#pac-input').show();
            $('#showCurrentPos').show();
            $('#insPos').show();
            manualPos();
        } else { // se la stanza non esiste
            $('#pac-input').hide();
            $('#showCurrentPos').hide();
            $('#insPos').hide();
            $('#btnCanc1').hide();
        }
    });


	// Save/Update Date-Time
	$('#date-format').bootstrapMaterialDatePicker({
        format: 'dddd DD MMMM YYYY HH:mm',
        weekStart: 1,
        minDate: moment(),
    });

    $("#date-format").change(function(){
        $.post("/set-time",{
            time_date: $("#date-format").val(),
            roomid: document.URL.split("/")[4].split("#")[0]
        });
        $.post("/send-notifications",{
            time_date: $("#date-format").val(),
            roomid: document.URL.split("/")[4].split("#")[0]
        });
    });


});