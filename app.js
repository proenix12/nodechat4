const express = require('express')
    , app = express()
    , http = require('http')
    , server = http.createServer(app)
    , io = require('socket.io').listen(server)
    , config = require('./config/database')
    , mongoose = require('mongoose')
    , bodyParser = require("body-parser")
    , path = require('path')
    , session = require('express-session')
    , passport = require('passport')
    , expressValidator = require('express-validator')
    , Users = require('./models/users')
    , NodeRSA = require('node-rsa');

server.listen(80);


mongoose.connect(config.database, {useCreateIndex: true, useNewUrlParser: true, useFindAndModify: false});
let db = mongoose.connection;

//Check connection
db.once('open', function () {
    console.log('connect to db');
});
//Check for db errors
db.on('error', function (error) {
    console.log(error);
});

app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));


// Express Session Middleware
app.use(session({
    secret: 'keyboard',
    resave: true,
    saveUninitialized: true
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});

//Express validator Middleware
app.use(expressValidator({
    errorFormatter: function (param, msg, value) {
        let namespace = param.split('.')
            , root = namespace.shift()
            , formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    }
}));

//Passport Config
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

//Set global for user
app.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated();
    next();
});


let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');

app.use('/', indexRouter);
app.use('/users', usersRouter);


let usernames = [];
let people = {};


let rooms = ['room1', 'room2', 'room3'];
let date = new Date().toLocaleTimeString();


function addUser(recipient, senderId, name, email, status) {

    let senderDetails = [
        {_id: senderId, name: name, email: email, friend: status}
    ];

    //update Database
    Users.Users.findByIdAndUpdate({
        _id: recipient
    }, {
        $push: {
            friends: senderDetails

        }
    }, {
        new: true,
        useFindAndModify: false,
        upsert: true

    }, function (err, res) {
        if (err) console.log(err);
        if (res) console.log(res);
    });
}


const key = new NodeRSA({b: 512});

// const encrypted = key.encrypt('5ced56cc5b93af1508f5bb79', 'base64');
// console.log('encrypted: ', encrypted);
//
// const decrypted = key.decrypt(encrypted, 'utf8');
// console.log('decrypted: ', decrypted);


function myDecrypted(dec) {
    let str = key.decrypt(dec, 'utf8');
    let target = str.replace('"', '');

    return target.replace('"', '');
}


io.sockets.on('connection', function (socket) {

    socket.on('event1', function (data) {
        io.to(data).emit("event2", 'test to person');
    });

    socket.on('adduser', function (username) {
        socket.userId = username.id;
        socket.username = username.name;
        socket.room = 'room1';

        people[socket.userId] = socket.id;


        //name: socket.username, id: socket.id
        let user = {name: socket.username, id: socket.id};


        pushUser(user);


        socket.join('room1');
        socket.emit('updatechat', 'SERVER', 'you have connected to room1', date);
        socket.broadcast.to('room1').emit('updatechat', 'SERVER', username.name + ' has connected to this room', date);
        socket.emit('updaterooms', rooms, 'room1');
    });

    socket.on('list-users', function () {
        Users.Users.find({}, function (err, users) {
            let allUsers = [];
            for (let i = 0; i < users.length; i++)
                allUsers[i] = {id: key.encrypt(users[i]._id, 'base64'), name: users[i].userName, email: users[i].email};

            socket.emit('new-list', allUsers);
            allUsers.slice(0, 1);
        });
    });

    socket.on('invite-friend', function (target, sender) {
        Users.Users.find({_id: sender}, function (err, user) {
            if (user) {
                addUser(myDecrypted(target), sender, user[0].userName, user[0].email, false);
                io.to(people[myDecrypted(target)]).emit("show-user-fiend-notification", user[0].userName + 'wat to be a friends', '/sounds/light.mp3');
            }
        });

    });

    socket.on('accept-fiend-request', function (recipient, sender) {
        recipient = myDecrypted(recipient);
        sender = myDecrypted(sender);
        const query = {
            _id: recipient,
            friends: {$elemMatch: {_id: sender}}
        }

        Users.Users.find(query, function (err, user) {
            if (err) console.log(err);
            for (let i = 0; i < user.length; i++) {
                for (let y = 0; y < user[i].friends.length; y++) {
                    if (user[i].friends[y]._id === sender && user[i].friends[y].friend === false) {
                        Users.Users.findByIdAndUpdate(
                            {
                                _id: user[i]._id,
                                friends: {$elemMatch: {_id: sender, friend: false}}
                            },
                            {
                                $set: {
                                    "friends.$[friend].friend": true
                                },
                            },
                            {
                                arrayFilters: [
                                    {
                                        'friend._id': sender
                                    },
                                ],
                                new: true,
                                useFindAndModify: false,
                                upsert: true,
                                multi: true,
                            },
                            function (err, res) {
                                if (err) console.log(err);
                                if (res)
                                    io.to(people[socket.userId]).emit("list-friend-requests", user[0].friends, key.encrypt(socket.userId, 'base64'));
                                addUser(sender, recipient, user[0].userName, user[0].email, true);
                            });
                    }
                }
            }
        })
    });

    socket.on('notification', function (sender) {
        Users.Users.find({_id: socket.userId}, function (err, user) {
            let getUnFriends = [];
            for (let i = 0; i < user.length; i++) {
                for (let y = 0; y < user[i].friends.length; y++) {
                    if (user[i].friends[y].friend === false) {
                        user[i].friends[y]._id = key.encrypt(user[i].friends[y]._id, 'base64');
                        getUnFriends.push(user[i].friends);
                    }
                }
            }
            if (user)
                io.to(people[socket.userId]).emit("list-friend-requests", getUnFriends, key.encrypt(socket.userId, 'base64'));
        });

    });

    socket.on('getFriendList', function () {
        let listAllFriends = [];
        Users.Users.findOne({_id: socket.userId, friends: {$elemMatch: {friend: true}}}, function (err, user) {
            if (!err)
                if (typeof user !== 'undefined' && user !== null) {
                    for (let i = 0; i < user.friends.length; i++) {
                        user.friends[i]._id = key.encrypt(user.friends[i]._id, 'base64');
                        listAllFriends.push(user.friends[i]);
                    }

                    io.to(people[socket.userId]).emit('list-client-friend-list', listAllFriends)
                }
        })
    });


    socket.on('start-private-chat-event', function (getUserId, senderId) {

    });

    socket.on('send-private-message', function (message) {

    });


    function pushUser(username) {
        if (usernames.push(username)) {
            socket.broadcast.to(socket.room).emit('newUserSound', '/sounds/light.mp3');
        }
    }

    let users = setInterval(function () {
        socket.emit('updateUsersList', usernames, socket.id);
    }, 5000);

    socket.on('sendchat', function (data) {
        io.sockets.in(socket.room).emit('updatechat', socket.username, data, date);
        socket.broadcast.to(socket.room).emit('newUserSound', '/sounds/relentless.mp3');
    });

    socket.on('switchRoom', function (newroom) {
        socket.leave(socket.room);
        socket.join(newroom);
        socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom, date);
        socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has left this room', date);
        socket.room = newroom;
        socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room', date);
        socket.emit('updaterooms', rooms, newroom);
    });


    socket.on('typing', (data) => {
        //socket.broadcast.emit('typing', {username:socket.username, typing:data});
        socket.broadcast.to(socket.room).emit('typing', {username: socket.username, typing: data});
    });

    socket.on('disconnect', function () {
        //Remove user from user list
        for (let i = 0; i < usernames.length; i++)
            if (usernames[i].name === socket.username && usernames[i].id === socket.id)
                usernames.splice(i, 1);


        for (let i in  people)
            if (people[i] === people[socket.userId])
                delete people[socket.userId];

        io.sockets.emit('updateusers', usernames);
        io.sockets.emit('updateUsersList', usernames, socket.id);
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected', date);
        socket.leave(socket.room);


        clearInterval(users);
    });
});
