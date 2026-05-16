document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const navItems = document.querySelectorAll('.nav-item');
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

    // Views Configuration
    const viewsData = {
        home: {
            title: 'اكتشف أسهل طريقة للتحميل',
            subtitle: 'ضع الرابط هنا وسنتكفل بالباقي، بدون علامات مائية وبأعلى جودة.',
            placeholder: 'أدخل الرابط هنا (يوتيوب، تيك توك، سناب شات...)'
        },
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

            const mainPanel = document.getElementById('mainPanel');
            
            // Start transition
            mainPanel.classList.add('view-transition');
            mainPanel.classList.remove('view-visible');

            setTimeout(() => {
                // Remove active class
                navItems.forEach(nav => nav.classList.remove('active'));
                // Add active class
                item.classList.add('active');

                // Change view
                currentView = newView;
                updateViewUI();

                // Reset state
                resetUI();

                // End transition
                mainPanel.classList.remove('view-transition');
                mainPanel.classList.add('view-visible');
            }, 300);
        });
    });

    function updateViewUI() {
        const data = viewsData[currentView];
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

    // Generate Buttons based on view
    function renderActionButtons() {
        actionButtonsContainer.innerHTML = ''; // clear

        const btnVideo = `<button onclick="window.startDownload('video')" class="btn action-btn video"><i class="fa-solid fa-video"></i> تحميل كفيديو (MP4)</button>`;
        const btnAudio = `<button onclick="window.startDownload('audio')" class="btn action-btn audio"><i class="fa-solid fa-music"></i> تحميل كصوت (MP3)</button>`;

        if (currentView === 'home') {
            actionButtonsContainer.innerHTML = btnVideo + btnAudio;
        } else if (currentView === 'video') {
            actionButtonsContainer.innerHTML = btnVideo;
        } else if (currentView === 'audio') {
            actionButtonsContainer.innerHTML = btnAudio;
        }
    }

    // Global function to be called from inline html buttons
    window.startDownload = (type) => {
        if (!currentUrl) return;

        resultCard.classList.add('hidden');
        downloadLoader.classList.remove('hidden');

        const downloadUrl = `/api/download?url=${encodeURIComponent(currentUrl)}&type=${type}`;

        // Trigger browser download
        window.location.href = downloadUrl;

        // Reset UI after delay
        setTimeout(() => {
            downloadLoader.classList.add('hidden');
            resultCard.classList.remove('hidden');
        }, 3500);
    };

    // Fetch Logic
    fetchBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();

        if (!url) {
            showError('لم تقم بإدخال أي رابط!');
            return;
        }

        try {
            new URL(url);
        } catch (_) {
            showError('يبدو أن الرابط غير صحيح، تأكد من نسخه بالكامل.');
            return;
        }

        currentUrl = url;
        errorMessage.classList.add('hidden');
        resultCard.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'خطأ في معالجة الرابط');
            }

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

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchBtn.click();
    });

    // ----------------------------------------
    // نظام جلب صورة واسم الديسكورد الخاص بك
    // ----------------------------------------
    const MY_DISCORD_ID = '1265586255832547350';

    async function loadDiscordProfile() {
        try {
            // Fetching directly from the external API instead of our local /api
            // This ensures it works even if the local server isn't reachable (like on static hosts)
            const res = await fetch(`https://discord-lookup-api.vercel.app/v1/user/${MY_DISCORD_ID}`);
            if (!res.ok) return;
            const data = await res.json();

            if (data && data.username) {
                document.getElementById('dcGlobalName').textContent = data.global_name || data.username;
                document.getElementById('dcUsername').textContent = '@' + data.username;
                if (data.avatar && data.avatar.link) {
                    document.getElementById('dcAvatar').src = data.avatar.link + '?size=256';
                }
            }
        } catch (e) {
            console.error('حدث خطأ أثناء جلب البروفايل', e);
        }
    }

    loadDiscordProfile();
});
