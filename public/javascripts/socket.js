const socket = io.connect('http://localhost:8080');

function switchRoom(room) {
    socket.emit('switchRoom', room);
}

$(function () {
    let users = $('#users');
    let timeout;
    let feedback = $('#feedback');


    var x = screen.height * 0.7;
    $('.chat-container').css("height", x);
    // on connection to server, ask for user's name with an anonymous callback
    socket.on('connect', function () {

        socket.emit('adduser', {id: loginId, name: loginName});
    });

    socket.on('updatechat', function (username, data, date) {

        $('#chatroom').append('<div class="message-container"><div class="message" style="color: #fff;"><span>'+date+'</span> <span class="user" style="color: #EE7600;">' + username + ':</span> <span>' + data + '</span> </div></div>');

        let objDiv = document.getElementById("chatroom");
        objDiv.scrollTop = objDiv.scrollHeight;
    });

    socket.on('updaterooms', function (rooms, current_room) {
        $('#rooms').empty();
        $.each(rooms, function (key, value) {
            if (value == current_room) {
                $('#rooms').append('<div class="ActiveRoom">' + value + '</div>');
            } else {
                $('#rooms').append('<div><a href="#" onclick="switchRoom(\'' + value + '\')">' + value + '</a></div>');
            }
        });
    });

    socket.on('updateUsersList', function (data) {
        let html = '';
        for (let i = 0; i < data.length; i++) {
            html += '<p style="color: #fff; border-bottom: 1px solid #38373a;"><span style="color:#EE7600;">' + data[i] + '</span> : is <span style="color:mediumspringgreen">Online</span> </p>';
        }
        users.html(html);
    });

    socket.on('newUserSound', function (sound) {
        console.log('new user sound');
        const audio = new Audio(sound);
        audio.play();
    });

    //User typing functions
    function timeoutFunction() {
        typing = false;
        socket.emit("typing", typing);
    }

    $('#text').keyup(function() {
        typing = true;
        socket.emit('typing', typing);
        clearTimeout(timeout);
        timeout = setTimeout(timeoutFunction, 1000);
    });

    socket.on('typing', (data) => {
        if (data.typing ===  true) {
            feedback.html('<p class="typing"><i>' + data.username + ' is typing a message....' + '</i></p>');
        } else {
            feedback.html('');
        }
    });

    $('#textarea').submit((e) => {
        e.preventDefault();
        let message = $('#text');
        // tell server to execute 'sendchat' and send along one parameter
        socket.emit('sendchat', message.val());
        message.val('');
        message.focus();
    });
    // when the client hits ENTER on their keyboard
    $('#textarea').keypress(function (e) {
        if (e.which == 13) {
            $(this).blur();
            $('.signupbtn').focus().click();
        }
    });
});