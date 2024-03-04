import express from 'express';
import fetch from 'node-fetch';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'; 
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(helmet());
app.use(cookieParser());
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

//Database connection
mongoose.connect('mongodb://localhost:27017/image_generator', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
const db = mongoose.connection;
db.once('open', () => {
    console.log('Connected to MongoDB');
});

//This will record every IP address clicked links to the database.

const clickedLinkSchema = new mongoose.Schema({
    ip: String,
    requestCount: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const ClickedLink = mongoose.model('ClickedLink', clickedLinkSchema);

//If the user have made a prompt more than twice, he'll receive 403 Forbidden Error.

const handleIPBlacklisting = async (req, res, next) => {
    try {
        const clientIP = req.ip;
        let ipRecord = await ClickedLink.findOne({ ip: clientIP });

        if (!ipRecord) {
            ipRecord = await ClickedLink.create({ ip: clientIP, requestCount: 1 });
        } else {
            ipRecord.requestCount++;
            ipRecord.timestamp = Date.now();
            await ipRecord.save();
        }

        if (ipRecord.requestCount > 2) {
            return res.status(403).send('Forbidden: You have exceeded the request limit.');
        }

        next();
    } catch (error) {
        console.error('Error handling IP blacklisting:', error);
        res.status(500).send('Internal Server Error');
    }
};


//Image generation function

async function generateAiImages(userPrompt, numImages) {
    try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                prompt: userPrompt,
                size: "512x512",
                response_format: "b64_json",
                n: numImages
            })
        });

        if (!response.ok) {
            throw new Error("Failed to generate images");
        }

        const { data } = await response.json();
        return data.map(image => `data:image/png;base64,${image.b64_json}`);
    } catch (error) {
        throw new Error(`Error generating images: ${error.message}`);
    }
}

//Server to client response
app.post('/generateAiImages', handleIPBlacklisting, async (req, res) => {
    const { userPrompt } = req.body;
    try {
        await ClickedLink.create({ prompt: userPrompt });
        console.log('Clicked link inserted into MongoDB');
        const generatedImages = await generateAiImages(userPrompt, 1);
        res.send({ images: generatedImages });
    } catch (error) {
        console.error('Error generating images:', error);
        res.status(500).send({ error: 'Failed to generate images' });
    }
});

//Run server
app.get('/', (req, res) => {
    res.send('Server is running');
});

//Disconnect from database
process.on('SIGINT', async () => {
    try {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
