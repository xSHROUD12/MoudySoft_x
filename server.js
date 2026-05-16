const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint for Discord Profile
app.get('/api/discord-user/:id', async (req, res) => {
    try {
        const response = await fetch(`https://discord-lookup-api.vercel.app/v1/user/${req.params.id}`);
        if (!response.ok) throw new Error('User not found');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Discord API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch Discord profile' });
    }
});

// Create downloads directory if not exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Endpoint 1: Get Video Info
app.get('/api/info', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'الرجاء إدخال رابط صحيح.' });
    }

    try {
        const info = await youtubedl(url, {
            dumpJson: true,
            noWarnings: true,
            noCheckCertificates: true
        });

        res.json({
            title: info.title || 'فيديو بدون عنوان',
            thumbnail: info.thumbnail || 'https://via.placeholder.com/300x200?text=No+Thumbnail',
            duration: info.duration_string || 'غير معروف',
            url: url
        });
    } catch (error) {
        console.error('Error fetching info:', error.message);
        res.status(500).json({ error: 'لم نتمكن من جلب بيانات الفيديو. تأكد من أن الرابط صحيح أو مدعوم.' });
    }
});

// Endpoint 2: Download Video/Audio
app.get('/api/download', async (req, res) => {
    const { url, type } = req.query;

    if (!url) {
        return res.status(400).send('الرابط مطلوب.');
    }

    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const outputTemplate = path.join(downloadsDir, `${uniqueId}.%(ext)s`);

    try {
        const info = await youtubedl(url, { dumpJson: true, noWarnings: true });
        // Clean title for safe filename
        const safeTitle = (info.title || 'MoadyDownload').replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim();

        let formatOptions = {};
        let expectedFileExt = '';
        let contentType = '';

        if (type === 'audio') {
            // Audio extraction setup
            formatOptions = {
                extractAudio: true,
                audioFormat: 'mp3',
                audioQuality: 0,
            };
            expectedFileExt = 'mp3';
            contentType = 'audio/mpeg';
        } else {
            // Video download setup (Max 1080p)
            formatOptions = {
                format: 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best',
                mergeOutputFormat: 'mp4',
            };
            expectedFileExt = 'mp4';
            contentType = 'video/mp4';
        }

        const options = {
            ...formatOptions,
            output: outputTemplate,
            noWarnings: true,
            noCheckCertificates: true
        };

        // If it's tiktok, yt-dlp usually fetches the watermark-free by default
        
        await youtubedl(url, options);

        const downloadedFile = path.join(downloadsDir, `${uniqueId}.${expectedFileExt}`);
        
        if (fs.existsSync(downloadedFile)) {
            const finalFilename = `${safeTitle}.${expectedFileExt}`;
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
            res.setHeader('Content-Type', contentType);
            
            res.download(downloadedFile, finalFilename, (err) => {
                if (err) {
                    console.error('Error sending file to user:', err);
                }
                // Delete the file after it's been sent to save space
                fs.unlink(downloadedFile, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting file:', unlinkErr);
                });
            });
        } else {
            res.status(500).send('فشل النظام في إنشاء الملف المطلوب.');
        }

    } catch (error) {
        console.error('Download execution error:', error.message);
        res.status(500).send('حدث خطأ أثناء تحميل ومعالجة الرابط.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});
