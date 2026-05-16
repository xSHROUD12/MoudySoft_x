const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// تحديد مسار محرك التحميل (يدوي أو تلقائي)
const localYtDlp = path.join(__dirname, 'yt-dlp');
const ytDlpPath = fs.existsSync(localYtDlp) ? localYtDlp : null;
if (ytDlpPath) {
    console.log('[LOG] Using local yt-dlp binary');
}

// Create downloads directory
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Endpoint 1: Get Video Info
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
            // Timeout after 30 seconds
            socketTimeout: 30
        });

        console.log(`[LOG] Successfully fetched: ${info.title}`);

        res.json({
            title: info.title || 'فيديو بدون عنوان',
            thumbnail: info.thumbnail || 'https://via.placeholder.com/300x200?text=No+Thumbnail',
            duration: info.duration_string || 'غير معروف',
            url: url
        });
    } catch (error) {
        console.error('[SERVER ERROR] Info Fetch:', error.message);
        // Return a more descriptive error if possible
        let errorMsg = 'لم نتمكن من جلب بيانات الفيديو.';
        if (error.message.includes('IncompleteYouTubePublicID')) errorMsg = 'الرابط غير مكتمل أو غير صحيح.';
        if (error.message.includes('403')) errorMsg = 'تم رفض الطلب من قبل الموقع المصدر.';

        res.status(500).json({ error: errorMsg, details: error.message });
    }
});

// Endpoint 2: Download Video/Audio
app.get('/api/download', async (req, res) => {
    const { url, type } = req.query;
    if (!url) return res.status(400).send('الرابط مطلوب.');

    const uniqueId = Date.now().toString();
    const outputTemplate = path.join(downloadsDir, `${uniqueId}.%(ext)s`);

    console.log(`[LOG] Starting download: ${url} (${type})`);

    try {
        // Step 1: Get metadata first to get correct extension and title
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

        // Step 2: Execute actual download
        await youtubedl(url, options);

        const downloadedFile = path.join(downloadsDir, `${uniqueId}.${expectedFileExt}`);

        if (fs.existsSync(downloadedFile)) {
            console.log(`[LOG] File ready: ${downloadedFile}`);
            const finalFilename = `${safeTitle}.${expectedFileExt}`;

            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
            res.setHeader('Content-Type', contentType);

            res.download(downloadedFile, finalFilename, (err) => {
                // Clean up after send
                fs.unlink(downloadedFile, (uErr) => {
                    if (uErr) console.error('[SERVER ERROR] Unlink failed:', uErr);
                });
            });
        } else {
            throw new Error('فشل النظام في إيجاد الملف بعد تحميله.');
        }

    } catch (error) {
        console.error('[SERVER ERROR] Download failed:', error.message);
        res.status(500).send(`حدث خطأ أثناء التحميل: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
