let socket = io.connect('http://localhost:80');

socket
    .on('connect', function () {
        socket.userId = loginId;
        socket.username = loginName;
        socket.emit('adduser', {id: loginId, name: loginName, email: loginEmail});
        socket.emit('notification', loginId);
        socket.emit('getFriendList');
    });

function switchRoom(room) {
    socket.emit('switchRoom', room);
}

jQuery(document).ready(function ($) {
    let users = $('.user-list-container');
    let timeout;
    let feedback = $('#feedback');

    //Chat tabs
    $(document).on('click', 'ul#tabs li', function (e) {
        e.preventDefault();
        let tab_id = $(this).attr('data-tab');

        $('ul#tabs li').removeClass('current');
        $('ul#tabs li a').removeClass('active-chat-tab');
        $('.container-tab').removeClass('current').css('display', 'none').fadeOut('slow');

        $(this).addClass('current').find('a').addClass('SubNavigation__item--active');
        $("#" + tab_id).addClass('current').css('display', 'block').fadeIn('slow');
    })


    let x = screen.height * 0.7;
    $('.chat-container').css("height", x);

    socket
        .on('asdf', function (data) {
            socket.userId = data;
        });

    socket
        .on('updatechat', function (username, data, date) {
            $('#chatroom').append('<div class="message-container"><div class="message" style="color: #fff;"><span>' + date + '</span> <span class="user" style="color: #EE7600;">' + username + ':</span> <span>' + data + '</span> </div></div>');

            let objDiv = document.getElementById("chatroom");
            objDiv.scrollTop = objDiv.scrollHeight;
        });

    socket
        .on('updaterooms', function (rooms, current_room) {
            $('#rooms').empty();
            $.each(rooms, function (key, value) {
                if (value == current_room) {
                    $('#rooms').append('<div class="roomVisual ActiveRoom">' + value + '</div>');
                } else {
                    $('#rooms').append('<div class="roomVisual"><a href="#" onclick="switchRoom(\'' + value + '\')">' + value + '</a></div>');
                }
            });
        });

    socket
        .on('updateUsersList', function (data, id) {
            let html = '';
            for (let i = 0; i < data.length; i++) {
                if (data[i].id != id) {
                    html += '<p class="userHandler" data-id="' + data[i].id + '" style="color: #fff; border-bottom: 1px solid #38373a;"><span style="color:#EE7600;">' + data[i].name + '</span> : is <span class="userStatus">Online</span> </p>';
                }
            }
            //users.html(html);
        });

    socket
        .on('newUserSound', function (sound) {
            const audio = new Audio(sound);
            audio.play();
        });

    //User typing functions
    function timeoutFunction() {
        typing = false;
        socket.emit("typing", typing);
    }

    $('#text')
        .keyup(function () {
            typing = true;
            socket.emit('typing', typing);
            clearTimeout(timeout);
            timeout = setTimeout(timeoutFunction, 1000);
        });

    socket
        .on('typing', (data) => {
            if (data.typing === true) {
                feedback.html('<p class="typing"><i>' + data.username + ' is typing a message....' + '</i></p>');
            } else {
                feedback.html('');
            }
        });

    socket
        .on('new-list', function (data) {
            let html = '';
            for (let i = 0; i < data.length; i++)
                html += '<div class="find-user-container"><div><img class="find-user-profileImage" src="/images/img_avatar.png" alt=""></div><div>' + data[i].name + '</div><div>' + data[i].email + '</div><div>Coming Soon</div><div><a class="invite-friend" data-id="' + data[i].id + '" href="#"><i class="fas fa-plus-square"></i></a></div></div>';

            $('#id04 .modal-content').html(html);
        });

    socket
        .on('show-user-fiend-notification', function (data, sound) {
            const audio = new Audio(sound);
            audio.play();
            socket.emit('notification', socket.userId);
        });

    socket
        .on('list-friend-requests', function (data, id) {
            if (data[0]) {
                let count = 0;
                let html = '';
                let showNotification = false;
                html += '<div class="dropdown-content">';
                for (let i = 0; i < data[0].length; i++) {
                    if (data[0][i].friend === false) {
                        showNotification = true;
                        count++;
                        html += '<div class="user-fr-request-list"><div><img src="/images/img_avatar.png"></div><div class="request-name-lis">' + data[0][i].name + '</div><div><button id="accept" data-id-sender="' + data[0][i]._id + '" data-id-recipient="' + id + '">Accept</button><button id="decline" data-id-sender="' + data[0][i]._id + '" data-id-recipient="' + id + '">Decline</button></div></div>';
                    }
                }

                html += '</div>';
                if (showNotification) {
                    $('.notifications').html('<div class="notification-message">U have ' + count + ' notification</div>' + html);
                } else {
                    $('.notifications').html('');
                    socket.emit('notification', loginId);
                }
            } else {
                //socket.emit('notification', loginId);
            }

        });

    socket
        .on('list-client-friend-list', function (friends) {
            let html = '';
            for (let i = 0; i < friends.length; i++) {
                html += '<div class="user-fr-request-list fr-new-styles"><div><img src="/images/img_avatar.png"></div><div>' + friends[i].name + '</div><div class="chatClass" data-id="' + friends[i]._id + '"><i class="fas fa-comment-dots"></i></div></div>';
            }
            $('.list-my-friends').html(html);

        });

    socket
        .on('openChatWindow', function (data) {
            console.log('chat, chat, chat');
        });

    $('#textarea')
        .submit(function (e) {
            e.preventDefault();
            let message = $('#text');
            // tell server to execute 'sendchat' and send along one parameter
            socket.emit('sendchat', message.val());
            message.val('');
            message.focus();
        });

    // when the client hits ENTER on their keyboard
    $('#textarea')
        .keypress(function (e) {
            if (e.which == 13) {
                $(this).blur();
                $('.signupbtn').focus().click();
            }
        });

    $('.private-textarea-field')
        .keypress(function (e) {
            if (e.which == 13) {
                $(this).blur();
                $('.private-textarea-form textarea').focus().submit();

                socket.emit('send-private-message', $(this).val());
                $(this).val('');
            }
        });

    socket.on('conversation private post', function (message) {
        console.log(message);
        $('#tab-1 .private-messages-container').append('<div>' + message + '</div>');
    });

    $('.private-textarea-form')
        .submit(function (e) {
            e.preventDefault();

            //socket.emit();
        });

    $('.settings-container a')
        .click(function (e) {
            e.preventDefault();
            let $this = $(this);

            $('#id01').css('display', 'block');
        });

    $(".search-users a")
        .click(function (e) {
            e.preventDefault();
            $('#id04').css('display', 'block');
            socket.emit('list-users');
        });

    $('#myRooms a')
        .click(function (e) {
            e.preventDefault();
            $('#id02').css('display', 'block');
        })

    $('.close, .closeApplication')
        .click(function (e) {
            e.preventDefault();
            $('.modal').css('display', 'none');
        });

    $(document)
        .on('click', '#accept', function (e) {
            e.preventDefault();
            socket.emit('accept-fiend-request', $(this).attr('data-id-recipient'), $(this).attr('data-id-sender'));
            socket.emit('notification', loginId);
            socket.emit('getFriendList');
        });


    $(document)
        .on('click', '.userHandler', function () {
            let $this = $(this);

            socket.emit('event1', $this.attr('data-id'));
        });

    $(document)
        .on('click', '.invite-friend', function (e) {
            e.preventDefault();
            socket.emit('invite-friend', $(this).attr('data-id'), socket.userId);
        });

    $(document)
        .on('click', '.chatClass', function () {
            jQuery('#id05').css('display', 'block');
            socket.emit('start-private-chat-event', $(this).attr('data-id'), socket.userId);
        });


    socket
        .on('event2', function (data) {
            $('#id03').css('display', 'flex');
        });

    $('.decline')
        .click(function (e) {
            // e.preventDefault();
            // $('#id03').css('display', 'none');
        });


});

