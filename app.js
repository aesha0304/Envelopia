const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const multer = require('multer'); 
const mysql = require('mysql');
const app = express();
const port = 3010;

const upload = multer({ dest: 'uploads/' }); 

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'xxxxxx',
    database: 'envelopia_emails'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

db.query(`CREATE TABLE IF NOT EXISTS emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account VARCHAR(255),
    to_email VARCHAR(255),
    subject VARCHAR(255),
    body TEXT
)`, (err, result) => {
    if (err) {
        console.error('Error creating emails table:', err);
    } else {
        console.log('Emails table created or already exists');
    }
});

let sentEmails = [];

const emailAccounts = {
    'gmail': {
        service: 'gmail',
        auth: {
            user: 'aeshakomal@gmail.com',
            pass: 'xxx'
        }
    },
    'outlook': {
        service: 'outlook',
        auth: {
            user: 'aesha.parikh15@nmims.in',
            pass:'zzxxzx'
        }
    },
    'yahoo': {
        service: 'yahoo',
        auth: {
            user: 'your_yahoo_account@yahoo.com',
            pass: 'your_yahoo_password'
        }
    }
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/send-email', upload.array('attachments'), (req, res) => {
    const { account, to, subject, body } = req.body;

    const attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path
    }));

    if (!account || !to || !subject || !body) {
        return res.status(400).send('Missing required fields');
    }

    const mailOptions = {
        ...emailAccounts[account], 
        from: emailAccounts[account].auth.user,
        to: to,
        subject: subject,
        text: body,
        attachments: attachments 
    };

    const transporter = nodemailer.createTransport(emailAccounts[account]);

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        } else {
            console.log('Email sent: ' + info.response);
            const { account, to, subject, body } = req.body;
            db.query('INSERT INTO emails (account, to_email, subject, body) VALUES (?, ?, ?, ?)', [account, to, subject, body], (err, result) => {
                if (err) {
                    console.error('Error storing email in database:', err);
                } else {
                    console.log('Email stored in database');
                }
            });
            return res.status(200).send('Email sent successfully!');
        }
    });
});

app.get('/sent-emails', (req, res) => {
    db.query('SELECT * FROM emails', (err, result) => {
        if (err) {
            console.error('Error retrieving emails from database:', err);
            return res.status(500).send('Internal Server Error');
        }
        const emailsWithUsernames = result.map(email => {
            const account = email.account;
            let username = '';
            switch (account) {
                case 'gmail':
                    username = 'aeshakomal@gmail.com';
                    break;
                case 'outlook':
                    username = 'aesha.parikh15@nmims.in';
                    break;
                case 'yahoo':
                    username = 'your_yahoo_account@yahoo.com';
                    break;
                default:
                    username = 'Unknown';
            }
            return { ...email, username: username };
        });
        res.json(emailsWithUsernames);
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
