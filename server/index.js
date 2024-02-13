import express from 'express'
import logger from 'morgan'

import { Server } from 'socket.io'
import { createServer } from 'node:http'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

dotenv.config()

const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)

const io = new Server(server, {
    connectionStateRecovery:{}
    })

const db = createClient({
    url: "libsql://possible-silver-samurai-mjf0004.turso.io",
    authToken: process.env.DB_TOKEN
})

await db.execute (`
    CREATE TABLE IF NOT EXISTS mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        username TEXT
    )
    `)

io.on('connection', async (socket) => {
    
    console.log('an user has connected')
    
    socket.on('disconnect', () => {
        console.log('an user has disconnected')
    })
    
    socket.on('Mensaje del chat', async (mensaje) => {
        let result
        const username = socket.handshake.auth.username ?? 'anonymous'
        try {

            result = await db.execute({
                sql: 'INSERT INTO mensajes (content, username) VALUES (:mensaje, :username)',
                args: { mensaje, username }
            }) 
        } catch (e) {
            console.error(e)
            return
        }
        io.emit('Mensaje del chat', mensaje, result.lastInsertRowid.toString(), username)

    })
   

    if (!socket.recovered) {
        try {
            const result = await db.execute ({
                sql: 'SELECT * FROM mensajes WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            })
            result.rows.forEach(row =>{
                socket.emit('Mensaje del chat', row.content, row.id.toString(), row.username)
            })
            
        } catch (e) {
            console.log(error)
        }
    }
})

app.use(logger('dev'))


app.get ('/', (req, res) => {
    res.sendFile(process.cwd() + '/cliente/index.html')
})

server.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
//Hasta aquí servidor web
