document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const mainPanel = document.getElementById('mainPanel');
    const homeView = document.getElementById('homeView');
    const downloaderView = document.getElementById('downloaderView');

    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const urlInput = document.getElementById('urlInput');
    const fetchBtn = document.getElementById('fetchBtn');

    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loader = document.getElementById('loader');
    const resultCard = document.getElementById('resultCard');
    const downloadLoader = document.getElementById('downloadLoader');

    const videoThumb = document.getElementById('videoThumb');
    const videoTitle = document.getElementById('videoTitle');
    const videoDuration = document.getElementById('videoDuration');
    const actionButtonsContainer = document.getElementById('actionButtons');

    let currentView = 'home';
    let currentUrl = '';

    const viewsData = {
        home: {},
        video: {
            title: 'تحميل الفيديوهات بأعلى جودة',
            subtitle: 'احصل على مقاطع الفيديو المفضلة لديك بصيغة MP4 خالية من العلامات المائية.',
            placeholder: 'أدخل رابط الفيديو لتحميله...'
        },
        audio: {
            title: 'استخراج الصوت بوضوح نقي',
            subtitle: 'قم بتحويل أي مقطع فيديو إلى ملف صوتي MP3 جاهز للاستماع.',
            placeholder: 'أدخل رابط المقطع الصوتي...'
        }
    };

    // Handle Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const newView = item.getAttribute('data-view');
            if (newView === currentView) return;

            // Start transition
            mainPanel.classList.add('view-transition');
            mainPanel.classList.remove('view-visible');

            setTimeout(() => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                currentView = newView;

                // Switch Content
                if (currentView === 'home') {
                    homeView.classList.remove('hidden');
                    downloaderView.classList.add('hidden');
                } else {
                    homeView.classList.add('hidden');
                    downloaderView.classList.remove('hidden');
                    updateDownloaderUI();
                }

                resetUI();

                // End transition
                mainPanel.classList.remove('view-transition');
                mainPanel.classList.add('view-visible');
            }, 300);
        });
    });

    function updateDownloaderUI() {
        const data = viewsData[currentView];
        if (!data) return;
        pageTitle.textContent = data.title;
        pageSubtitle.textContent = data.subtitle;
        urlInput.placeholder = data.placeholder;
    }

    function resetUI() {
        urlInput.value = '';
        errorMessage.classList.add('hidden');
        loader.classList.add('hidden');
        resultCard.classList.add('hidden');
        downloadLoader.classList.add('hidden');
        currentUrl = '';
    }

    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.classList.remove('hidden');
        loader.classList.add('hidden');
        resultCard.classList.add('hidden');
    }

    function renderActionButtons() {
        actionButtonsContainer.innerHTML = '';
        const btnVideo = `<button onclick="window.startDownload('video')" class="btn action-btn video"><i class="fa-solid fa-video"></i> تحميل كفيديو (MP4)</button>`;
        const btnAudio = `<button onclick="window.startDownload('audio')" class="btn action-btn audio"><i class="fa-solid fa-music"></i> تحميل كصوت (MP3)</button>`;

        if (currentView === 'video') {
            actionButtonsContainer.innerHTML = btnVideo;
        } else if (currentView === 'audio') {
            actionButtonsContainer.innerHTML = btnAudio;
        } else {
            actionButtonsContainer.innerHTML = btnVideo + btnAudio;
        }
    }

    window.startDownload = (type) => {
        if (!currentUrl) return;
        resultCard.classList.add('hidden');
        downloadLoader.classList.remove('hidden');
        window.location.href = `/api/download?url=${encodeURIComponent(currentUrl)}&type=${type}`;
        setTimeout(() => {
            downloadLoader.classList.add('hidden');
            resultCard.classList.remove('hidden');
        }, 3500);
    };

    fetchBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return showError('لم تقم بإدخال أي رابط!');

        try { new URL(url); } catch (_) { return showError('الرابط غير صحيح.'); }

        currentUrl = url;
        errorMessage.classList.add('hidden');
        resultCard.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'خطأ في معالجة الرابط');

            videoThumb.src = data.thumbnail;
            videoTitle.textContent = data.title;
            videoDuration.textContent = data.duration;
            renderActionButtons();

            loader.classList.add('hidden');
            resultCard.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
        }
    });

    urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') fetchBtn.click(); });

    const MY_DISCORD_ID = '1265586255832547350';
    async function loadDiscordProfile() {
        try {
            const res = await fetch(`https://discord-lookup-api.vercel.app/v1/user/${MY_DISCORD_ID}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.username) {
                const name = data.global_name || data.username;
                document.getElementById('dcGlobalName').textContent = name;
                document.getElementById('dcUsername').textContent = '@' + data.username;

                // Update home page too
                const homeAvatar = document.getElementById('homeAvatar');
                if (data.avatar && data.avatar.link) {
                    const avatarUrl = data.avatar.link + '?size=256';
                    document.getElementById('dcAvatar').src = avatarUrl;
                    if (homeAvatar) homeAvatar.src = avatarUrl;
                }
            }
        } catch (e) { console.error('Discord fetch failed', e); }
    }
    loadDiscordProfile();
});
