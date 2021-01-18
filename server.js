const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'test',
      database : 'smartbrain'
    }
  });

const app = express();

 app.use(bodyParser.json());
 app.use(cors());

app.get('/',(req,res)=>{
    res.send('its working!');
})
app.post('/signin' , (req, res) => {
        db.select('email','hash').from('login')
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if(isValid){
               return db.select('*').from('users').where('email','=', req.body.email)
               .then(user=>{
                   res.json(user[0]);
               })
               .catch(err=> res.status(400).json('unnable get user'))
            }else{
                res.status(400).json('wrong password');
            }
        })
        .catch(err => res.status(400).json('wrong login'))
    })

app.post('/register',(req,res)=>{
    const {name,email,password} = req.body;
    
    const hash = bcrypt.hashSync(password);

    db.transaction(trx=> {
       trx.insert({
           hash: hash,
           email: email
       })
    .into('login')
    .returning('email')
    .then(loginEmail=> {
        return trx('users')
        .returning('*')
        .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
        })
        .then(user=>{
            res.json(user[0])
        })
    })
    .then(trx.commit)
    .catch(trx.rollback)
})
    .catch(err=> res.status(400).json('insert no sucessful'))
})

app.get('/profile/:id',(req,res)=>{
    const { id } = req.params;
    db.select('*').from('users').where({id})
    .then(user => {
        if(user.length){
          res.json(user[0])
        }else{
            res.status(400).json('not found');
        }
        
    })
    .catch(err=>res.status(400).json('user not found'))

})

app.put('/image',(req,res)=>{
    const { id } = req.body;
    db('users').where('id','=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err=> res.status(400).json('not getting entries'))
})

app.listen(process.env.PORT || 3000, ()=>{
    console.log(`Server is listening on port ${process.env.PORT}`)
});