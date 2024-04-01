const Imap = require('imap');
const iconv = require('iconv-lite');
const simpleParser = require('mailparser').simpleParser;
const username = 'username';
const password = 'Password';

const inspect = require('util').inspect;
let myInbox = {value : null};
let imap = new Imap({
  user: username,
  password: password,
  host: 'mail.telecom.kz',
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

function processMail(msg, seqno) {
  console.log('Message #%d', seqno);
  let prefix = '(#' + seqno + ') ';
  msg.on('body', function (stream, info) {
    let buffer = '';
    stream.on('data', function (chunk) {
      buffer += chunk.toString('utf8');
    });
    stream.once('end', function () {
      console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
      const subject = Imap.parseHeader(buffer).subject[0];
      const pattern = /Вашей группе предложена заявка № IM-CL-(.*)/;
      const match = subject.match(pattern);

      if (match) {
        const nextString = match[1];
        console.log('Next string after matching fragment:', nextString);
        simpleParser(buffer, (err, mail) => {
          const descriptionPattern = /Краткое описание:(.*)/;
          const descriptionMatch = mail.html.match(descriptionPattern);
          if (descriptionMatch) {
            let description = descriptionMatch[1].trim().replace("</FONT>", "");
            description = description.replace("</div>", "");
            console.log('Краткое описание:', description);
           DoOnNewEmail(" Заявка с номером " + nextString + " и описанием: " + description);
          }

        });

      }
    });
  });
}

function DoOnNewEmail(text) {
sendTelegramNotification(text);
}

function sendTelegramNotification(text) {
  const token = 'token';
  const chatId = '-chatId';
  const currentTime = new Date();
  const message = `Уведомление с IM: ${currentTime.toLocaleString()}`; 

  fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${message + text}`)
  .then(response => {
      if (!response.ok) {
          throw new Error('Ошибка отправки уведомления в Telegram');
      }
  })
  .catch(error => {
      console.error('Ошибка:', error);
  });
}


imap.once('ready', function () {
  openInbox(function (err, box) {
    if (err) throw err;
    imap.on('mail', (mails) => {
      if(mails < 15){
          let b = imap.seq.fetch(box.messages.total - (mails - 1) + ':*', {
            bodies: '',
            struct: true
          });
          b.on('message', function (msg, seqno) {
           processMail(msg, seqno);
          });
          b.once('error', function (err) {
            console.log('Fetch error: ' + err);
          });
        }
      }
      )
    

  });
});

imap.once('error', function (err) {
  console.log(err);
});

imap.once('end', function () {
  console.log('Connection ended');
});


imap.connect();
