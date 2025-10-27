const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CommentSchema = new Schema({
    author: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const PostSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    codeSnippet: {
        language: {
            type: String,
            default: 'javascript'
        },
        code: {
            type: String
        }
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [CommentSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Post', PostSchema)