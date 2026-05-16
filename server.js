const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// --- نظام الإنقاذ التلقائي للمحرك ---
const localYtDlp = path.join(__dirname, 'yt-dlp');
let ytDlpPath = fs.existsSync(localYtDlp) ? localYtDlp : null;

async function ensureYtDlp() {
    if (!ytDlpPath) {
        console.log('[RESCUE] yt-dlp not found. Attempting automatic download...');
        try {
            // تحميل النسخة المناسبة لـ Linux (سيرفرات Render)
            execSync(`curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "${localYtDlp}"`);
            execSync(`chmod +x "${localYtDlp}"`);
            ytDlpPath = localYtDlp;
            console.log('[RESCUE] ✅ yt-dlp downloaded and ready!');
        } catch (err) {
            console.error('[RESCUE] ❌ Failed to download yt-dlp:', err.message);
        }
    }
}
ensureYtDlp();
// ---------------------------------

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.get('/api/info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'الرابط مطلوب.' });

    console.log(`[LOG] Fetching info for: ${url}`);

    try {
        const info = await youtubedl(url, {
            dumpJson: true,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            geoBypass: true,
            binaryPath: ytDlpPath,
            socketTimeout: 30
        });

        res.json({
            title: info.title || 'فيديو بدون عنوان',
            thumbnail: info.thumbnail || 'https://via.placeholder.com/300x200?text=No+Thumbnail',
            duration: info.duration_string || 'غير معروف',
            url: url
        });
    } catch (error) {
        console.error('[SERVER ERROR] Info Fetch:', error.message);
        res.status(500).json({
            error: 'السيرفر يواجه مشكلة في المحرك. يرجى الانتظار دقيقة والمحاولة مجدداً.',
            details: error.message
        });
    }
});

app.get('/api/download', async (req, res) => {
    const { url, type } = req.query;
    if (!url) return res.status(400).send('الرابط مطلوب.');

    const uniqueId = Date.now().toString();
    const outputTemplate = path.join(downloadsDir, `${uniqueId}.%(ext)s`);

    try {
        const info = await youtubedl(url, {
            dumpJson: true,
            noWarnings: true,
            binaryPath: ytDlpPath
        });
        const safeTitle = (info.title || 'MoadyDownload').replace(/[^\w\s\u0600-\u06FF-]/gi, '').trim();

        const options = {
            output: outputTemplate,
            noWarnings: true,
            noCheckCertificates: true,
            preferFreeFormats: true,
            geoBypass: true,
            binaryPath: ytDlpPath
        };

        let expectedFileExt = '';
        let contentType = '';

        if (type === 'audio') {
            options.extractAudio = true;
            options.audioFormat = 'mp3';
            options.audioQuality = 0;
            expectedFileExt = 'mp3';
            contentType = 'audio/mpeg';
        } else {
            options.format = 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best';
            options.mergeOutputFormat = 'mp4';
            expectedFileExt = 'mp4';
            contentType = 'video/mp4';
        }

        await youtubedl(url, options);

        const downloadedFile = path.join(downloadsDir, `${uniqueId}.${expectedFileExt}`);

        if (fs.existsSync(downloadedFile)) {
            const finalFilename = `${safeTitle}.${expectedFileExt}`;
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
            res.setHeader('Content-Type', contentType);
            res.download(downloadedFile, finalFilename, (err) => {
                fs.unlink(downloadedFile, (uErr) => { });
            });
        } else {
            throw new Error('الملف غير موجود بعد التحميل.');
        }

    } catch (error) {
        res.status(500).send(`خطأ في التحميل: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
