import express from 'express';
import http, { IncomingMessage, request } from 'http';
import bodyParser from 'body-parser';
import expressSession, { SessionData } from 'express-session';
import { RowDataPacket } from 'mysql2';
import { Server, Socket } from 'socket.io';
import { define } from 'mime';
import { db } from './db';

declare module 'express-session' {
  interface SessionData {
    user?: { id: number, username: string, channel: number };
  }
}

interface SessionIncomingMessage extends IncomingMessage {
  session: SessionData
}

export interface SessionSocket extends Socket {
  request: SessionIncomingMessage
}

interface Story {
  username: string,
  content: string
}

interface Occupy {
  room: number,
  user: number
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  connectionStateRecovery: {},
});
const session = expressSession({
  secret: 'verysecret',
  resave: false,
  saveUninitialized: true,
  cookie: {},
});

const rooms: Occupy[] = [];

export const wrapper = (middleware: any) => (socket: Socket, next: any) => middleware(socket.request, {}, next);
io.use(wrapper(session));

const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: true });

app.use(jsonParser);
app.use(urlencodedParser);
app.use(session);
app.use(express.static(`${__dirname}/public`));

app.get('/', (request, response) => {
  console.log('/index route');
  if (request.session.user) {
    console.log('on va vers index_co');
    response.redirect('/index_co');
  } else { response.sendFile(`${__dirname}/public/views/index.html`); }
});

app.get('/index_co', (request, response) => {
  response.sendFile(`${__dirname}/public/views/index_co.html`);
  console.log('get_index_co route');
});

app.post('/index_co', (request, response) => {
  console.log('post_index_co route');
  delete request.session.user;
  console.table(request.session.user);
  response.redirect('/');
});

app.get('/login', (request, response) => {
  console.log('get_login route');
  if (request.session.user) {
    response.redirect('/chat');
  } else {
    console.log('login route');
    response.sendFile(`${__dirname}/public/views/login.html`);
  }
});

app.get('/create_login', (request, response) => {
  response.sendFile(`${__dirname}/public/views/singup.html`);
});

app.post('/sing_up', (request, response) => {
  console.log('post_sing_up route');
  const { username } = request.body;
  const { password } = request.body;
  const query = (`insert into users ( username, password , role_id) values ( '${username}' , '${password}' , 1);`);
  db.query(query, (error, result) => {
    if (error) {
      console.error('utilisateur non crée');
      response.redirect('/');
    } else {
      console.log('nouvel utilisateur crée');
      response.redirect('/login');
    }
  });
});

app.post('/login', (request, response) => {
  console.log('post_login route');
  const { username } = request.body;
  const { password } = request.body;
  if (username && password) {
    const query = 'SELECT * from users where ( username, password)  = (?,?);';
    const args = [username, password];
    db.query(query, args, (error, result) => {
      const data = <RowDataPacket>result;
      console.table(data);
      if (error) {
        console.log(error);

        response.send('error connecting to bdd');
      } else if (Object.keys(data).length != 0 && data.constructor != Object) {
        console.log('user found');
        console.log(error, result);
        request.session.user = {
          id: data[0].id,
          username: data[0].username,
          channel: 1,
        };
        rooms.push({ user: request.session.user.id, room: 1 });
        console.log(rooms);
        response.redirect('/chat');
      } else {
        console.log('user not found');
        response.redirect('/login');
      }
    });
  } else {
    console.log('username or password missing');
    response.send('username or password missing');
  }
});

app.get('/chat', (request, response) => {
  if (request.session.user) {
    response.sendFile(`${__dirname}/public/views/chat.html`);
  } else {
    response.redirect('/');
  }
});

app.get('/changepass', (request, response) => {
  response.sendFile(`${__dirname}/public/views/changepass.html`);
});

app.get('/pagemain', (request, response) => {
  response.sendFile(`${__dirname}/public/views/index_co.html`);
});

app.post('/changepass', (request, response) => {
  console.log('post_change_pass route');
  const oldpass = request.body.old_password;
  const newpass = request.body.new_password;
  const tcheckpass = request.body.renew_password;
  if (oldpass && newpass && tcheckpass) {
    if (newpass === tcheckpass) {
      const query = (`select username, password from users where id=${request.session.user?.id} ;`);
      db.query(query, (error, result) => {
        if (error) {
          console.error('impossible de contacter bdd');
        } else {
          const data = <RowDataPacket>result;
          console.table(data);
          if (oldpass === data[0].password && request.session.user?.username === data[0].username) {
            const query = (`update users set password='${newpass}' where id=${request.session.user?.id} ;`);
            db.query(query, (error) => {
              if (error) {
                console.error('pas marché');
              } else {
                console.log('mot de passe changé');
              }
            });
          }
        }
      });
    } else {
      response.redirect('/changepass');
    }
  }
});

app.get('/createroom', (request, response) => {
  console.log('lallala');
  response.sendFile(`${__dirname}/public/views/createroom.html`);
});

app.post('/createroom', (request, response) => {
  console.log('post_create_room route');
  const { channel_name } = request.body;
  console.log(channel_name);
  const query = (`insert into channels (channel_name) values ('${channel_name}');`);
  db.query(query, (error, result) => {
    if (error) {
      console.error('echec insertion');
    } else {
      const data = <RowDataPacket>result;
      console.table(data);
      db.query(`insert into inter_channel_user (channel_id,user_id) values (${data.insertId} , ${request.session.user?.id});`, (error) => {
        if (error) {
          console.error(error);
        } else {
          console.log(request.session.user);
          if (request.session.user != undefined) {
            request.session.user.channel = data.insertId;
            console.table(request.session.user);
            response.redirect('/chat');
          }
        }
      });
    }
  });
});

io.on('connection', (defaultSocket: Socket) => {
  const socket = <SessionSocket>defaultSocket;
  const userSession = socket.request.session.user;
  console.log(socket.id);
  if (userSession) {
    console.log(`${userSession.username} is connected`);
    const query = (`select users.username,messages.content from messages,users where messages.user_id=users.id and channel_id=${socket.request.session.user?.channel};`);
    db.query(query, (error, result) => {
      if (error) {
        console.error('impossible de charger l\'historique');
      } else {
        console.log('historique chargé pour nouvel utilisateur');
        const data = <RowDataPacket>result;
        data.forEach((element: Story) => {
          const OneStory = `${element.username} : ${element.content}`;
          io.to(socket.id).emit('chat historic', OneStory);
        });
      }
    });
    socket.on('disconnect', () => {
      const bonhomme: Occupy = { user: userSession.id, room: userSession.channel };
      const index = rooms.indexOf(bonhomme);
      rooms.slice(index, 1);
      console.table(rooms);
      console.log('user disconnected');
    });
    socket.on('chat message', (mssg) => {
      io.emit('chat message', `${userSession.username}: ${mssg}`, userSession, rooms);
      const query = `insert into messages (content, user_id, channel_id) values ('${mssg}' , ${userSession.id} , ${userSession.channel});`;
      db.query(query, (error, result) => {
        if (error) {
          console.error('attention insertion ratée');
        } else {
          console.log('insertion réussie');
        }
      });
    });
  }
});

httpServer.listen(3000, () => console.log('Welcome on My IRC'));
