
$(document).ready(function(){


	//Cancel of Friend's modal
	$('#btnCanc').click(function(){
        $('#modal1').closeModal();
        $("input[name=check]:checked").attr('checked',false);
    });


    //Close the modal
    $('.btn-lg').leanModal();

    //Send invite message
    $('#send').click(function(){
        $('input[name=check]').each(function() {
            if(this.checked){
                $.post("/send-message",{
                    tag: $(this).attr('id'),
                    userid: $(this).attr('title'),
                    roomid: document.URL.split("/")[4].split("#")[0]
                });
                $("label[id=lcheck"+$(this).attr('id')+"]").text("Invited");
                $(this).attr('checked', false);
                $(this).prop('disabled', true);
                setTimeout(function(){
                    $("#modal1").closeModal();
                }, 150);
            }
        });
    });

    //Check of invited friends
    $('#filled-in').click(function(){
        $(this).toggle(
            function () {
                $('.check').attr('Checked','Checked');
            },
            function () {
                $('.check').removeAttr('Checked');
            }
        );
    });

    /******* Button of automatic position ?? *******/
    $('#showCurrentPos').click(function() {
        $("#update").show();
        $("#pac-input").show();
        auto();
    });


    //Create/update name-room 
    $('#btnOK').click(function() { // stanza creata
        if ($('#room_name').val() != '') {
            $("#inv-button").removeAttr("disabled");
            $('#eventName').text($('#room_name').val());
            $.post('/create-room',{
                room: $('#room_name').val(),
                roomid: document.URL.split("/")[4].split("#")[0]
            });
            $.post('/send-notifications',{
                room_name: $("#room_name").val(),
                roomid: document.URL.split("/")[4].split("#")[0]
            });
            if (roomexists != "1") { // se la stanza non esiste deve partire manualPos
                $('#insPos').show();
                $('#tutorial').hide();
                $('#map').show();
                $('#pac-input').show();
                $('#showCurrentPos').show();
                $('#btnCanc1').show();
                manualPos();
                roomexists = "1";
            } //altrimenti cambio solo il nome e non parte manualPos
        } else {
        	$('#eventName').text('Event Description');
        }
        $(this).hide();
    });

    //btnOK ENTER
    $('#room_name').keypress(function(e) {
        if (e.which == 13) {
            $('#btnOK').click();
        }
    });



    //Update Position
    $('#update').click(function() {
        $('#manual').val(indirizzo);
	    $.post('/send-coordinates', {
	        addr: $("#manual").val(),
	        position: currPos,
	        roomid: document.URL.split("/")[4].split("#")[0]
	    });
	    $('#update').hide();
	    $('#btnCanc1').hide();
	    $('#insPos').hide();
	    $('#pac-input').hide();
	    $('#showCurrentPos').hide();
	    middle(); // punto medio
	});



    //Cancel update position
	$('#btnCanc1').click(function() {
	    if (!$('#manual').val()) {
	        $('#tutorialpos').show();
	        $('#map').hide();
	    } else {
	        middle(); // punto medio
	    }
	    $('#pac-input').hide();
	    $('#showCurrentPos').hide();
	    $('#update').hide();
	    $('#insPos').hide();
	    $("#btnCanc1").hide();
	});



});