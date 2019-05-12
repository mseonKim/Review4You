var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var bkfd2Password = require('pbkdf2-password');
var hasher = bkfd2Password();
var moment = require('moment');
var path = require('path');

router.use(bodyParser.urlencoded({extended: false}));

/** MySQL */
var sqlconn = mysql.createConnection({
  host : 'marketingaidb.csiociym4gut.us-west-1.rds.amazonaws.com',
  user : 'root',
  password : '_PeopleSpace',
  database : 'account'
});
sqlconn.connect();

/** redirect to login */
router.get('/', function(req, res, next) {
  res.redirect('/auth/login');
});

/** Login Page */
router.get('/login', function(req, res, next) // GET login page
{
  // Access control
  if(req.session.bIsLogined)
  {
    res.redirect('/userboard');
    return false;
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
  console.log('login page');
  //res.send('login page');
  //res.render('login');
});

router.post('/login', function(req, res, next)  // POST login page
{
  var selectQuery = 'SELECT * FROM users WHERE email LIKE ?'; // This will be changed to real table name
  // Get input account data from web
  var inputID = req.body.email; // change to "inputID = req.body.email";
  var inputPW = req.body.password; // change to "inputPW = req.body.accountPassword";
  // Login
  //return res.json({authToken : "test"});
  sqlconn.query(selectQuery, [inputID], function(err, rows, fields)
  {
    if(err) {console.log(err);}
    else
    {
      // check ID & PW for login
      if(rows[0] != undefined)
      {
        hasher({password: inputPW, salt: rows[0].salt}, function(err, pass, salt, hash)
        {
          if(hash == rows[0].userPassword) // Login success
          {
            console.log('login success');
            req.session.bIsLogined = true;
            req.session.loginAccount = inputID;
            req.session.save(function() {
              //res.json({authToken: req.sessionID});
            });
          }
          else {console.log('login failure'); res.json({authToken: req.sessionID});}
        });
      }
      else {console.log('login failure'); res.json({authToken: req.sessionID});}
    }
  });
});

router.post('/login-firebase', function(req, res, next)
{
  //console.log('post login-firebase page');
  req.session.bIsLogined = true;
  req.session.loginAccount = req.body.email;
  req.session.save();
  res.json({authToken: req.sessionID});
});

/** Logout page */
router.post('/logout', function(req, res)
{
  // Access control
  if(!req.session.bIsLogined)
  {
    res.redirect('/');
    return false;
  }
  delete req.session.bIsLogined;
  delete req.session.loginAccount;
  req.session.save(function() {
    res.redirect('/');
  });
});

/** Register Page */
router.get('/signup', function(req, res, next)  // GET register page
{
  // Access control
  if(req.session.bIsLogined)
  {
    res.redirect('/userboard');
    return false;
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
  console.log('register page');
  //res.render('register');
});

router.post('/signup', function(req, res, next) // POST register page
{
  var inputID = req.body.email; // change to inputID = req.body.accountId;
  var inputPW = req.body.password; // change to inputPW = req.body.accountPassword;
  var inputName = req.body.name;
  var creationDate = moment().format('YYYY-MM-DD HH:mm:ss');
  var selectQuery = 'SELECT * FROM users';
  var insertQuery = 'INSERT INTO users (email, userPassword, userName, creationDate, salt) VALUES(?, ?, ?, ?, ?)'; // This will be changed to real table name
  // checking if there's no same name user
  sqlconn.query(selectQuery, function(err, rows, fields)
  {
    hasher({password: inputPW}, function(err, pass, salt, hash)
    {
      var insertData = [inputID, hash, inputName, creationDate, salt];
      sqlconn.query(insertQuery, insertData, function(err, result, fields)
      {
        if(err) {console.log(err), res.status(500).send('Internal Server Error - Register');} // if there is the same Id in db
        else {res.redirect('/auth/login');}
      });
    });
  });
});

module.exports = router;