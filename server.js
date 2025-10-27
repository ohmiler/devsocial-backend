const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')
const path = require('path')

const authRoute = require('./routes/auth')
const postRoute = require('./routes/posts')
const usersRoute = require('./routes/users')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => console.error(err))

app.get('/', (req, res) => {
    res.send('API is running...')
})

app.use('/api/auth', authRoute)
app.use('/api/posts', postRoute)
app.use('/api/users', usersRoute)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))