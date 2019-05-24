var express = require('express');
var router = express.Router();
let Users = require('../models/users');

/* GET home page. */
router.get('/', function(req, res, next) {
    Users.find({}, function (err, users) {

        res.render('index', {
            users: users,
            title: 'Index'
        });

    });
});

router.get('/app', function (req, res) {

    if (req.user) { // if user is login
        let test = {
            'id': req.user._id,
            'name': req.user.userName,
            'email': req.user.email
        };

        res.render('app', { data:test } );
    } else {
        //  if user is not login
        // send message and redirect user
        req.flash('success', 'Please login');
        res.redirect('/users/login');
    }
});

/* GET home page. */
router.get('/app', function(req, res, next) {
    res.render('app');
});
module.exports = router;