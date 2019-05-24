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
    , expressValidator = require('express-validator');

server.listen(8080);

mongoose.connect(config.database, {useCreateIndex: true, useNewUrlParser: true});
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


let rooms = ['room1', 'room2', 'room3'];

io.sockets.on('connection', function (socket) {
    //send stuff to socket.id
    //console.log(socket.id);
    //io.to(socket.id).emit("event", data);]
    let date = new Date().toLocaleTimeString();

    socket.on('adduser', function (username) {
        socket.username = username.name;
        socket.room = 'room1';

        pushUser(username.name);



        socket.join('room1');
        socket.emit('updatechat', 'SERVER', 'you have connected to room1', date);
        socket.broadcast.to('room1').emit('updatechat', 'SERVER', username.name + ' has connected to this room', date);
        socket.emit('updaterooms', rooms, 'room1');
    });

    function pushUser(username){
        if(usernames.push(username))
            socket.broadcast.to(socket.room).emit('newUserSound', '/sounds/light.mp3');
    }

    var users = setInterval(function () {
        socket.emit('updateUsersList', usernames);
    }, 1000);

    socket.on('sendchat', function (data) {
        io.sockets.in(socket.room).emit('updatechat', socket.username, data, date);
        socket.broadcast.to(socket.room).emit('newUserSound', '/sounds/relentless.mp3');
    });

    socket.on('switchRoom', function (newroom) {
        socket.leave(socket.room);
        socket.join(newroom);
        socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);
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
        for( let i = 0; i < usernames.length; i++){
            if ( usernames[i] === socket.username) {
                usernames.splice(i, 1);
            }
        }

        io.sockets.emit('updateusers', usernames);
        io.sockets.emit('updateUsersList', usernames);
        socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
        socket.leave(socket.room);


        clearInterval(users);
    });
});