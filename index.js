var express = require('express');
var cfenv = require('cfenv');
var app = express();
var request = require('request');
var Cloudant = require('cloudant');
var path = require('path');
var bodyParser = require('body-parser');
var json2csv = require('json2csv');
var fs = require('fs');

var app = express()

app.set('port', (process.env.PORT || 5000))
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: false
}))

// parse application/json
app.use(bodyParser.json())

//To Store URL of Cloudant VCAP Services as found under environment variables on from App Overview page
var cloudant_url = 'https://0f274073-0373-4142-936b-2e296441e800-bluemix:e30d7c95df8ec9df83ac8e1f2cda506145b884825e0e5e3ec7b22e8cb7ce0bb3@0f274073-0373-4142-936b-2e296441e800-bluemix.cloudant.com';
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
// Check if services are bound to your project
if (process.env.VCAP_SERVICES) {
    services = JSON.parse(process.env.VCAP_SERVICES);
    if (services.cloudantNoSQLDB) //Check if cloudantNoSQLDB service is bound to your project
    {
        cloudant_url = services.cloudantNoSQLDB[0].credentials.url; //Get URL and other paramters
        console.log("Name = " + services.cloudantNoSQLDB[0].name);
        console.log("URL = " + services.cloudantNoSQLDB[0].credentials.url);
        console.log("username = " + services.cloudantNoSQLDB[0].credentials.username);
        console.log("password = " + services.cloudantNoSQLDB[0].credentials.password);
    }
}

//Connect using cloudant npm and URL obtained from previous step
var cloudant = Cloudant({
    url: cloudant_url
});
//Edit this variable value to change name of database.
var dbname = 'notes_db';
var db;

//Create database
cloudant.db.create(dbname, function(err, data) {
    db = cloudant.db.use(dbname);
    if (err) //If database already exists
        console.log("Database exists."); //NOTE: A Database can be created through the GUI interface as well
    else {
        console.log("Created database.");
        db.insert({
                _id: "_design/notes_db",
                views: {
                    "notes_db": {
                        "map": "function (doc) {\n  emit(doc._id, [doc._rev, doc.userid]);\n}"
                    }
                }
            },
            function(err, data) {
                if (err)
                    console.log("View already exists. Error: ", err); //NOTE: A View can be created through the GUI interface as well
                else
                    console.log("notes_db view has been created");
            });
    }
});



app.get('/', function(req, res) {
    res.render('index', {
        nlc: "Enter a sample restaurant review to get started."
    });
})

app.post('/insertnote', function(req, res) {
    db.find({
        selector: {
            userid: req.body.userid
        }
    }, function(er, result) {
        if (er) {
            throw er;
        }
        eventNames = result.docs;
        console.log('Found %d documents with name ' + req.query.msg, result.docs.length);

        if (result.docs.length > 0) {
            updatednotes = eventNames[0].notes;
            updatednotes.push(req.body.note);


            var user = {
                'userid': eventNames[0].userid,
                'notes': updatednotes,
                '_id': eventNames[0]._id,
                '_rev': eventNames[0]._rev
            };

            db.insert(user, function(err, body) {});
            res.render('index');
        } else {
            db.insert({
                    'userid': req.body.userid,
                    'notes': [req.body.note]
                },
                function(err, data) {
                    if (err)
                        console.log("Note already exists. Error: ", err); //NOTE: A View can be created through the GUI interface as well
                    else
                        console.log("Note has been created");
                });
            res.send('Note Saved.')
        }


    });
})

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'))
})
