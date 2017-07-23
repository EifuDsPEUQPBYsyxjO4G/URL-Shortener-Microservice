const express = require('express');
const Datastore = require('nedb');
const validUrl = require('valid-url');
const path = require('path');

const db = new Datastore({
    filename: 'database.nedb',
    autoload: true
});

db.ensureIndex({
    fieldName: 'short',
    unique: true
}, function(err) {
    if (err) throw err;
});

db.ensureIndex({
    fieldName: 'url',
    unique: true
}, function(err) {
    if (err) throw err;
});

const app = express();
app.enable('trust proxy');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
    res.render('index', {
        title: 'URL Shortener Microservice',
        url: `${req.protocol}://${req.headers.host}`
    });
});

app.get('/:shortUrl', (req, res, next) => {
    if (!req.params.shortUrl.match(/^\d{4}$/)) {
        return next();
    }

    db.find({
        short: parseInt(req.params.shortUrl)
    }, (err, docs) => {
        if (err) throw err;

        if (docs.length) {
            return res.redirect(docs[0].url);
        }
        else {
            res.json({
                error: "This url is not in the database."
            })
        }
    });
});

function getShortURL(req, short) {
    return `${req.protocol}://${req.headers.host}/${short}`;
}

app.use((req, res, next) => {
    if (req.path.startsWith('/new/')) {
        var url = req.path.substring('/new/'.length, req.path.length);
        if (!url.length) return next();
        if (validUrl.isUri(url)) {
            db.find({
                url: url
            }, (err, docs) => {
                if (err) throw err;
                if (docs.length) {
                    res.json({
                        original_url: docs[0].url,
                        short_url: getShortURL(req, docs[0].short),
                    });
                }
                else {
                    db.insert({
                        short: Math.floor(1000 + Math.random() * 9000), // https://stackoverflow.com/questions/29640432/generate-4-digit-random-number-using-substring
                        url: url
                    }, (err, doc) => {
                        res.json({
                            original_url: doc.url,
                            short_url: getShortURL(req, doc.short),
                        });
                    });
                }
            });
        }
        else {
            res.json({
                'error': 'Wrong url format, make sure you have a valid protocol and real site.'
            });
        }
    }
    else {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

var listener = app.listen(process.env.PORT || 3000, () => {
    console.log(`Server listening on ${listener.address().port}`);
});
