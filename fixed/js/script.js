document.addEventListener('DOMContentLoaded', () => {

    /* =============================================
       CARREGAMENTO DINÂMICO DE NOTÍCIAS
       CORREÇÃO: sanitização dos dados do JSON antes
       de inserir no DOM para evitar XSS
    ============================================= */
    const loadNews = async () => {
        const container = document.getElementById('dynamic-news-container');
        if (!container) return;

        try {
            const response = await fetch('noticias.json');
            if (!response.ok) throw new Error('Erro ao carregar o arquivo JSON');

            const newsData = await response.json();

            // Utilitário de escape para strings inseridas no DOM
            const escapeHTML = (str) => {
                const div = document.createElement('div');
                div.textContent = String(str || '');
                return div.innerHTML;
            };

            // Valida que a URL de imagem é segura (http/https ou caminho relativo)
            const safeImageUrl = (url) => {
                if (!url) return '';
                try {
                    const parsed = new URL(url, window.location.href);
                    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? url : '';
                } catch {
                    return '';
                }
            };

            let mainNewsHTML = '';
            let secondaryNewsHTML = '<div class="secondary-news">';

            newsData.forEach(news => {
                const safeTitle    = escapeHTML(news.title);
                const safeCategory = escapeHTML(news.category);
                const safeResume   = escapeHTML(news.resume);
                const safeImage    = safeImageUrl(news.image);
                const safeLink     = news.link ? escapeHTML(news.link) : '#';

                if (news.isMain) {
                    mainNewsHTML = `
                        <a href="${safeLink}" class="news-card-link" ${safeLink !== '#' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                            <article class="news-card main-news" tabindex="0">
                                <div class="news-image" style="background-image: url('${safeImage}');" role="img" aria-label="${safeTitle}"></div>
                                <div class="news-content">
                                    <span class="category">${safeCategory}</span>
                                    <h3 class="line-clamp-2">${safeTitle}</h3>
                                    <p class="line-clamp-3">${safeResume}</p>
                                </div>
                            </article>
                        </a>
                    `;
                } else {
                    secondaryNewsHTML += `
                        <a href="${safeLink}" class="news-card-link" ${safeLink !== '#' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                            <article class="news-card side-news" tabindex="0">
                                <div class="news-image small" style="background-image: url('${safeImage}');" role="img" aria-label="${safeTitle}"></div>
                                <div class="news-content">
                                    <span class="category">${safeCategory}</span>
                                    <h4 class="line-clamp-2">${safeTitle}</h4>
                                </div>
                            </article>
                        </a>
                    `;
                }
            });

            secondaryNewsHTML += '</div>';
            container.innerHTML = mainNewsHTML + secondaryNewsHTML;

        } catch (error) {
            console.error('Erro na requisição das notícias:', error);
            container.innerHTML = `
                <div class="error-msg" style="color: #aaa; padding: 20px; text-align: center; grid-column: 1 / -1;">
                    <i class="fa-solid fa-circle-exclamation" style="color: var(--jp-red); font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>Não foi possível carregar as notícias. Verifique o arquivo <strong>noticias.json</strong>.</p>
                </div>
            `;
        }
    };

    loadNews();


    /* =============================================
       PLAYER DE RÁDIO
       CORREÇÃO 1: URL permanente sem token JWT expirado
       CORREÇÃO 2: src atribuído apenas uma vez (na 1ª reprodução)
       CORREÇÃO 3: handler para evento 'error' adicionado
    ============================================= */
    const audio         = document.getElementById('radio-stream');
    const playPauseBtn  = document.getElementById('play-pause-btn');
    const playIcon      = playPauseBtn?.querySelector('i');
    const visualizer    = document.getElementById('visualizer');
    const statusLabel   = document.getElementById('player-status-label');
    const volumeSlider  = document.getElementById('volume-slider');
    const volumeIcon    = document.getElementById('volume-icon');

    // CORREÇÃO: URL permanente sem parâmetro ?zt= (token JWT)
    const STREAM_URL = 'https://stream.zeno.fm/rtk4pzcome3vv';

    let streamLoaded = false; // garante que o src é atribuído apenas uma vez

    const updateVolumeIcon = (vol) => {
        if (!volumeIcon) return;
        if (vol === 0)        volumeIcon.className = 'fa-solid fa-volume-xmark';
        else if (vol < 0.5)   volumeIcon.className = 'fa-solid fa-volume-low';
        else                  volumeIcon.className = 'fa-solid fa-volume-high';
    };

    const updateUIState = (isPlaying) => {
        if (!playIcon) return;

        playIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        playPauseBtn?.setAttribute('aria-pressed', String(isPlaying));
        visualizer?.classList.toggle('paused', !isPlaying);

        if (statusLabel) {
            statusLabel.textContent = isPlaying ? 'TOCANDO AGORA' : 'PAUSADO';
            statusLabel.classList.toggle('is-playing', isPlaying);
            statusLabel.classList.toggle('is-paused', !isPlaying);
        }
    };

    // Restaura volume salvo
    const savedVolume = localStorage.getItem('jp_volume');
    if (audio) {
        const volume = savedVolume !== null
            ? Math.min(1, Math.max(0, Number(savedVolume)))
            : 0.8;

        audio.volume = volume;
        if (volumeSlider) volumeSlider.value = String(Math.round(volume * 100));
        updateVolumeIcon(volume);
    }

    const togglePlay = async () => {
        if (!audio) return;

        try {
            if (audio.paused) {
                // CORREÇÃO: src atribuído apenas na primeira reprodução (não a cada clique)
                if (!streamLoaded) {
                    audio.src = STREAM_URL;
                    streamLoaded = true;
                }
                await audio.play();
                updateUIState(true);
            } else {
                audio.pause();
                updateUIState(false);
            }
        } catch (error) {
            console.warn('Reprodução impedida:', error);
            updateUIState(false);
        }
    };

    audio?.addEventListener('waiting', () => {
        if (playIcon) playIcon.className = 'fa-solid fa-circle-notch fa-spin';
        if (statusLabel) statusLabel.textContent = 'SINTONIZANDO...';
    });

    audio?.addEventListener('playing', () => {
        if (playIcon) playIcon.className = 'fa-solid fa-pause';
        if (statusLabel) {
            statusLabel.textContent = 'TOCANDO AGORA';
            statusLabel.classList.add('is-playing');
            statusLabel.classList.remove('is-paused');
        }
        visualizer?.classList.remove('paused');
    });

    audio?.addEventListener('pause', () => {
        updateUIState(false);
    });

    // CORREÇÃO: handler de erro adicionado — evita UI travada em "SINTONIZANDO..."
    audio?.addEventListener('error', () => {
        console.error('Falha ao reproduzir o stream.');
        updateUIState(false);
        if (statusLabel) {
            statusLabel.textContent = 'ERRO NO STREAM';
            statusLabel.classList.remove('is-playing');
        }
        // Permite tentar novamente no próximo clique
        streamLoaded = false;
    });

    volumeSlider?.addEventListener('input', (e) => {
        const target = e.target;
        if (!audio || !target) return;

        const vol = Number(target.value) / 100;
        audio.volume = vol;
        updateVolumeIcon(vol);
        localStorage.setItem('jp_volume', String(vol));
    });

    let previousVolume = audio?.volume ?? 0.8;
    volumeIcon?.addEventListener('click', () => {
        if (!audio) return;

        if (audio.volume > 0) {
            previousVolume = audio.volume;
            audio.volume = 0;
            if (volumeSlider) volumeSlider.value = '0';
        } else {
            audio.volume = previousVolume > 0 ? previousVolume : 0.8;
            if (volumeSlider) volumeSlider.value = String(Math.round(audio.volume * 100));
        }

        updateVolumeIcon(audio.volume);
        localStorage.setItem('jp_volume', String(audio.volume));
    });

    playPauseBtn?.addEventListener('click', togglePlay);
    document.getElementById('btn-header-play')?.addEventListener('click', togglePlay);
    document.getElementById('hero-play-trigger')?.addEventListener('click', togglePlay);

    // CORREÇÃO: listener adicionado para o botão "Ouvir Agora" do Pânico
    document.getElementById('btn-play-show')?.addEventListener('click', togglePlay);


    /* =============================================
       MENU MOBILE
    ============================================= */
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav       = document.querySelector('.main-nav');
    const menuLinks     = document.querySelectorAll('.main-nav a');

    const toggleMenu = () => {
        if (!mobileMenuBtn || !mainNav) return;

        const isActive = mainNav.classList.toggle('active');
        mobileMenuBtn.setAttribute('aria-expanded', String(isActive));

        const icon = mobileMenuBtn.querySelector('i');
        if (icon) icon.className = isActive ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';

        // CORREÇÃO: body.menu-open agora tem CSS correspondente (overflow: hidden)
        document.body.classList.toggle('menu-open', isActive);
    };

    mobileMenuBtn?.addEventListener('click', toggleMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mainNav?.classList.contains('active')) toggleMenu();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mainNav?.classList.contains('active')) {
            toggleMenu();
        }
    });


    /* =============================================
       HEADER DINÂMICO AO ROLAR
    ============================================= */
    const header = document.getElementById('main-header');

    const onScroll = () => {
        if (!header) return;
        header.classList.toggle('scrolled', window.scrollY > 80);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();


    /* =============================================
       LÓGICA DE PROGRAMAÇÃO AO VIVO
    ============================================= */
    const updateLiveSchedule = () => {
        const now            = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const dayOfWeek      = now.getDay();
        const cards          = document.querySelectorAll('.schedule-card');

        cards.forEach(card => {
            card.classList.remove('active');

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const startAttr = card.getAttribute('data-start');
                const endAttr   = card.getAttribute('data-end');

                if (startAttr && endAttr) {
                    const [startH, startM] = startAttr.split(':').map(Number);
                    const [endH, endM]     = endAttr.split(':').map(Number);
                    const startTotal       = startH * 60 + startM;
                    const endTotal         = endH * 60 + endM;

                    if (currentMinutes >= startTotal && currentMinutes < endTotal) {
                        card.classList.add('active');
                    }
                }
            }
        });
    };

    updateLiveSchedule();
    setInterval(updateLiveSchedule, 60000);


    /* =============================================
       SCROLL REVEAL
    ============================================= */
    const revealElements = document.querySelectorAll('.section-container, .news-card, .schedule-card, .yt-video-card');
    revealElements.forEach(el => el.classList.add('reveal'));

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('active'));
    }

});
