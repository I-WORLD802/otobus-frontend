   const API_BASE = "https://otobus-deneyimleri-production.up.railway.app/api";
let currentPage = 1;
let currentSearch = "";

// Global XSS Koruma Fonksiyonu
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Tüm rotaları filtreleme ve sayfalama için hafızada tutacağımız global değişkenler
let allRoutesData = [];
let currentRoutePage = 1;
const routesPerPage = 12;

// 1. Ana sayfadaki firmaları modern logolu ve puan rozetli çeken fonksiyon
async function getCompanies(page = 1, updateUrl = true) {
    currentPage = parseInt(page) > 0 ? parseInt(page) : 1;

    // YENİ EKLENEN: URL'yi yenilemeden (pushState ile) güncelleme
    if (updateUrl) {
        const url = new URL(window.location);
        url.searchParams.set('page', currentPage);
        
        if (currentSearch) {
            url.searchParams.set('search', currentSearch);
        } else {
            url.searchParams.delete('search');
        }
        window.history.pushState(null, '', url);
    }

    try {
        const res = await fetch(`${API_BASE_URL}/Companies/paged?page=${currentPage}&search=${currentSearch}`);
        
        const companyList = document.getElementById("companyList");
        
        if (!res.ok) {
            if (companyList) companyList.innerHTML = `<p class="empty-message" style="color:red;">API Hatası!</p>`;
            return;
        }
        
        const data = await res.json();
        
        if (!companyList) return;

        if (data.items.length === 0) {
            companyList.innerHTML = `<p class="empty-message">Aradığınız kriterlere uygun firma bulunamadı.</p>`;
            if (document.getElementById("pagination")) {
                document.getElementById("pagination").innerHTML = "";
            }
            return;
        }

        companyList.innerHTML = data.items.map(c => {
            const companyName = c.name || c.Name;
            const slug = c.slug || c.Slug;
            
            // Backend'den direkt gelen veriler (PascalCase / camelCase uyumluluğu ile)
            const reviewCount = c.reviewCount ?? c.ReviewCount ?? 0;
            const rating = c.averageRating ?? c.AverageRating ?? 0;

            let badgeClass = "badge-green";

            if (rating < 4 && rating >= 3) {
                badgeClass = "badge-orange";
            } else if (rating < 3 && rating > 0) {
                badgeClass = "badge-red";
            }

            if (rating === 0) {
                badgeClass = "badge-gray";
            }

            return `
            <a href="firma.html?slug=${slug}" class="modern-company-card">
                <div class="card-left">
                    <img 
                        src="images/logos/${slug}.png" 
                        data-fallback="https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=f1f5f9&color=64748b&rounded=true"
                        onerror="this.onerror=null; this.src=this.dataset.fallback;"
                        alt="${escapeHtml(companyName)}" 
                        class="company-logo"
                    >

                    <div class="company-info">
                        <h4>${escapeHtml(companyName)}</h4>
                        <span>${reviewCount} Değerlendirme</span>
                    </div>
                </div>

                <div class="card-right">
                    <div class="rating-badge ${badgeClass}">
                        ★ ${rating > 0 ? rating.toFixed(1) : '-'}
                    </div>
                </div>
            </a>
            `;
        }).join("");

        renderPagination(data.totalPages || data.TotalPages);

    } catch (error) {
        console.error("Firmalar çekilirken hata oluştu:", error);
    }
}
// 2. Sayfalama Butonlarını Çizdirme
function renderPagination(totalPages) {
    const paginationDiv = document.getElementById("pagination");
    if (!paginationDiv) return;

    let html = "";

    for (let i = 1; i <= totalPages; i++) {
        const activeClass = (i === currentPage) ? 'active' : '';

        html += `
            <button onclick="getCompanies(${i})" class="page-btn ${activeClass}">
                ${i}
            </button>
        `;
    }

    paginationDiv.innerHTML = html;
}

// 3. Arama Kutusu Tetikleyici
function searchCompanies() {
    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        currentSearch = searchInput.value;
        getCompanies(1);
    }
}

// 4. URL Yardımcısı
function getSlugFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('slug');
}

// 5. Firma Detaylarını ve Yorumlarını Getirme
async function loadCompanyDetails() {
    const slug = getSlugFromUrl();

    if (!slug) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Companies/${slug}`);

        if (!response.ok) {
            const baslik = document.getElementById('companyName');

            if (baslik) {
                baslik.innerText = "Firma Bulunamadı";
            }

            return;
        }

        const company = await response.json();

        const firmaAdiElementi = document.getElementById('companyName');

        if (firmaAdiElementi) {
            firmaAdiElementi.innerText = company.name;
        }
        // YENİ EKLENEN: Dinamik sayfa başlığı
        document.title = `${company.name} Firma Değerlendirmeleri | Otobüs Deneyimleri`;

        // YENİ EKLENEN: Dinamik meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = `${company.name} hakkında yolcuların yaptığı değerlendirmeleri, puanları ve seyahat deneyimlerini inceleyin.`;
        }

        loadCompanyReviews(company.id);

    } catch (error) {
        console.error("Firma detayı çekilirken hata:", error);
    }
}

// (YARDIMCI) Sayısal puanı görsel yıldıza çeviren algoritma
function renderStars(rating) {
    const puan = Math.round(rating || 0);
    let stars = "";

    for (let i = 1; i <= 5; i++) {
        if (i <= puan) {
            stars += "⭐";
        } else {
            stars += "☆";
        }
    }

    return stars;
}

// Yorumları filtrelerken kullanmak üzere hafızada tutan değişken
let currentCompanyReviews = [];

// 6. Firmaya Ait Yorumları Ekrana Basma ve İstatistikleri Güncelleme
async function loadCompanyReviews(companyId) {
    const reviewsContainer = document.getElementById('reviewsContainer');

    if (!reviewsContainer) return;

    try {
        // DEĞİŞİKLİK: Bütün yorumlar yerine sadece ilgili companyId'ye ait yorumlar çekiliyor.
        const response = await fetch(`${API_BASE_URL}/Reviews?companyId=${companyId}`);
        const reviews = await response.json();

        // DEĞİŞİKLİK: Frontend filter işlemi kaldırıldı, gelen veriyi doğrudan atıyoruz.
        currentCompanyReviews = reviews;

        const overallRatingElement = document.querySelector('.overall-rating');
        const scoreValues = document.querySelectorAll('.score-value');

        if (currentCompanyReviews.length > 0) {
            let totalOverall = 0;
            let totalClean = 0;
            let totalComfort = 0;
            let totalPunc = 0;
            let totalStaff = 0;

            currentCompanyReviews.forEach(r => {
                totalOverall += r.overallRating ?? r.OverallRating ?? 0;
                totalClean += r.cleanliness ?? r.Cleanliness ?? 0;
                totalComfort += r.comfort ?? r.Comfort ?? 0;
                totalPunc += r.punctuality ?? r.Punctuality ?? 0;
                totalStaff += r.staff ?? r.Staff ?? 0;
            });

            const count = currentCompanyReviews.length;

            if (overallRatingElement) {
                overallRatingElement.innerHTML =
                    `<span class="stars">⭐ ${(totalOverall / count).toFixed(1)}</span> - ${count} değerlendirme`;
            }

            if (scoreValues.length >= 4) {
                scoreValues[0].innerText = (totalPunc / count).toFixed(1);
                scoreValues[1].innerText = (totalClean / count).toFixed(1);
                scoreValues[2].innerText = (totalComfort / count).toFixed(1);
                scoreValues[3].innerText = (totalStaff / count).toFixed(1);
            }

        } else {
            if (overallRatingElement) {
                overallRatingElement.innerHTML =
                    `<span class="stars">⭐ -</span> - 0 değerlendirme`;
            }

            scoreValues.forEach(el => el.innerText = "-");
        }

        if (currentCompanyReviews.length === 0) {
            reviewsContainer.innerHTML = "<p>Henüz değerlendirme yapılmamış.</p>";
            return;
        }

        const sortSelect = document.getElementById('reviewSort');

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                renderSortedReviews(e.target.value);
            });
        }

        renderSortedReviews('newest');

    } catch (error) {
        console.error("Yorumlar çekilirken hata:", error);
    }
}

// 6.1 Yorumları Sıralama ve Çizdirme Motoru
function renderSortedReviews(sortType) {
    const reviewsContainer = document.getElementById('reviewsContainer');

    if (!reviewsContainer || currentCompanyReviews.length === 0) return;

    let sortedReviews = [...currentCompanyReviews];

    if (sortType === 'newest') {
        sortedReviews.sort(
            (a, b) => (b.id || b.Id) - (a.id || a.Id)
        );
    } else if (sortType === 'highest') {
        sortedReviews.sort(
            (a, b) =>
                (b.overallRating ?? b.OverallRating ?? 0) -
                (a.overallRating ?? a.OverallRating ?? 0)
        );
    } else if (sortType === 'lowest') {
        sortedReviews.sort(
            (a, b) =>
                (a.overallRating ?? a.OverallRating ?? 0) -
                (b.overallRating ?? b.OverallRating ?? 0)
        );
    }

    reviewsContainer.innerHTML = sortedReviews.map(r => {
        const puan = r.overallRating ?? r.OverallRating ?? 0;
        const yorum = escapeHtml(r.text ?? r.Text ?? 'Yorum metni yok.');
        const yolcuAdi = escapeHtml(r.userName ?? r.UserName ?? 'Anonim Yolcu');
        const yildizGorseli = renderStars(puan);

        const adminYanitiMetni = escapeHtml(r.adminReply || r.AdminReply);
        const adminYaniti = adminYanitiMetni
            ? `
                <div style="margin-top: 15px; padding: 12px; background-color: #f4f3fb; border-left: 4px solid #6c5ce7; border-radius: 4px;">
                    <strong style="color: #6c5ce7; font-size: 0.9rem;">
                        👑 Yönetici Yanıtı:
                    </strong>

                    <p style="margin: 5px 0 0 0; font-size: 0.95rem; color: #444; line-height: 1.5;">
                        ${adminYanitiMetni}
                    </p>
                </div>
            `
            : "";

        return `
        <div style="background: #f9f9f9; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #007bff; transition: all 0.3s ease;">
            <div style="font-weight: bold; margin-bottom: 0.5rem; color: #f39c12;">
                ${yildizGorseli} (${puan}/5) -
                <span style="color:#555; font-size:0.9rem;">
                    ${yolcuAdi}
                </span>
            </div>

            <p style="margin: 0; color: #444; font-size: 1.05rem;">
                ${yorum}
            </p>

            ${adminYaniti}
        </div>
        `;
    }).join("");
}

// Global olarak bu sayfadaki yorumları tutmak için değişken
let currentRouteCompanyReviews = [];

// --- ROTA + FİRMA BAZLI YORUMLARI ÇEKME ---
async function loadRouteCompanyReviews() {

    const urlParams = new URLSearchParams(window.location.search);

    const routeSlug = urlParams.get('routeSlug');
    const companySlug = urlParams.get('companySlug');

    const container = document.getElementById('crReviewsContainer');

    // DOM Elementleri
    const crTitle = document.getElementById('crTitle');
    const crOverallRating = document.getElementById('crOverallRating');
    const crReviewCount = document.getElementById('crReviewCount');

    const crScoreDakiklik = document.getElementById('crScoreDakiklik');
    const crScoreTemizlik = document.getElementById('crScoreTemizlik');
    const crScoreKonfor = document.getElementById('crScoreKonfor');
    const crScorePersonel = document.getElementById('crScorePersonel');
    const crScoreIkram = document.getElementById('crScoreIkram');

    // GERİ DÖN BUTONU
    const crBackLink = document.getElementById('crBackLink');

    if (crBackLink && routeSlug) {
        crBackLink.href = `rota.html?slug=${routeSlug}`;
    }

    // İlgili ID sayfada yoksa çalışmasın
    if (!container) return;

    if (!routeSlug || !companySlug) {
        container.innerHTML =
            "<p style='color:red;'>Geçersiz bağlantı: Rota veya firma bilgisi eksik.</p>";

        return;
    }

    // Slug değerlerini Türkçe büyük harfe çeviren yardımcı fonksiyon
    const capitalize = (str) =>
        str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1);

    const formattedRouteName = routeSlug
        .split('-')
        .map(capitalize)
        .join(' ➔ ');

    const fallbackCompanyName = companySlug
        .split('-')
        .map(capitalize)
        .join(' ');

    // Boş veri durumlarında UI'ı sıfırlayan yardımcı fonksiyon
    const setEmptyStats = (compName) => {

        if (crTitle) {
            crTitle.innerText =
                `${compName} — ${formattedRouteName}`;
        }

        if (crOverallRating) {
            crOverallRating.innerText = "⭐ - / 5";
        }

        if (crReviewCount) {
            crReviewCount.innerText = "0 değerlendirme";
        }

        [
            crScoreDakiklik,
            crScoreTemizlik,
            crScoreKonfor,
            crScorePersonel,
            crScoreIkram
        ].forEach(el => {
            if (el) {
                el.innerText = "Veri yok";
            }
        });
    };

    try {

        const response = await fetch(
            `${API_BASE_URL}/Routes/${routeSlug}/companies/${companySlug}/reviews`
        );

        if (!response.ok) {

            container.innerHTML =
                "<p style='color:red;'>Yorumlar yüklenirken bir hata oluştu.</p>";

            setEmptyStats(fallbackCompanyName);

            return;
        }

        const reviews = await response.json();
        
        // YENİ EKLENEN: Orijinal diziyi globale kaydet
        currentRouteCompanyReviews = reviews; 

        if (reviews.length === 0) {

            container.innerHTML =
                "<p>Bu rota ve firma için henüz değerlendirme yapılmamış.</p>";

            setEmptyStats(fallbackCompanyName);

            return;
        }

        // Gerçek firma adını al
        const companyName =
            (reviews[0].company && reviews[0].company.name) ||
            fallbackCompanyName;

        if (crTitle) {
            crTitle.innerText =
                `${companyName} — ${formattedRouteName}`;
        }

        // Ortalama hesaplama
        // 0 ve null değerleri hesaba katılmaz
        const calcAvg = (arr, prop) => {

            const validValues = arr
                .map(r => r[prop])
                .filter(v =>
                    v !== null &&
                    v !== undefined &&
                    v >= 1
                );

            if (validValues.length === 0) {
                return null;
            }

            const sum = validValues.reduce(
                (a, b) => a + b,
                0
            );

            return (sum / validValues.length).toFixed(1);
        };

        const avgOverall = (
            reviews.reduce(
                (sum, r) =>
                    sum + (r.overallRating || 0),
                0
            ) / reviews.length
        ).toFixed(1);

        const avgClean = calcAvg(reviews, 'cleanliness');
        const avgComfort = calcAvg(reviews, 'comfort');
        const avgPunc = calcAvg(reviews, 'punctuality');
        const avgStaff = calcAvg(reviews, 'staff');
        const avgCatering = calcAvg(reviews, 'catering');

        // Hesaplanan puanları DOM'a bas
        if (crOverallRating) {
            crOverallRating.innerText =
                `⭐ ${avgOverall} / 5`;
        }

        if (crReviewCount) {
            crReviewCount.innerText =
                `${reviews.length} değerlendirme`;
        }

        const formatScore = (val) =>
            val !== null
                ? `${val} / 5`
                : "Veri yok";

        if (crScoreDakiklik) {
            crScoreDakiklik.innerText =
                formatScore(avgPunc);
        }

        if (crScoreTemizlik) {
            crScoreTemizlik.innerText =
                formatScore(avgClean);
        }

        if (crScoreKonfor) {
            crScoreKonfor.innerText =
                formatScore(avgComfort);
        }

        if (crScorePersonel) {
            crScorePersonel.innerText =
                formatScore(avgStaff);
        }

        if (crScoreIkram) {
            crScoreIkram.innerText =
                formatScore(avgCatering);
        }

        // YENİ EKLENEN: Yorumları bas ve sıralama dinleyicisini çalıştır
        renderRouteReviews(currentRouteCompanyReviews);
        initReviewSortListener();

    } catch (error) {

        console.error("Yorum verisi alınamadı:", error);

        container.innerHTML =
            "<p style='color:red;'>Sunucu bağlantı hatası oluştu.</p>";

        setEmptyStats(fallbackCompanyName);
    }
}
// --- ROTA VE FİRMA YORUMLARI BİTİŞİ ---

// --- YORUM SIRALAMA VE EKRANA BASMA (FİRMA-ROTA SAYFASI) ---
function initReviewSortListener() {
    const sortSelect = document.getElementById("routeReviewSort");
    if (!sortSelect) return;

    sortSelect.onchange = function () {
        const criteria = this.value;
        if (!currentRouteCompanyReviews || currentRouteCompanyReviews.length === 0) return;

        const sorted = [...currentRouteCompanyReviews];

        sorted.sort((a, b) => {
            if (criteria === "newest") {
                const dateA = a.travelDate ? new Date(a.travelDate).getTime() : 0;
                const dateB = b.travelDate ? new Date(b.travelDate).getTime() : 0;
                return dateB - dateA; 
            } 
            else if (criteria === "highest") {
                const scoreA = (a.overallRating !== null && a.overallRating !== undefined) ? a.overallRating : -1;
                const scoreB = (b.overallRating !== null && b.overallRating !== undefined) ? b.overallRating : -1;
                return scoreB - scoreA; 
            } 
            else if (criteria === "lowest") {
                const scoreA = (a.overallRating !== null && a.overallRating !== undefined) ? a.overallRating : 999;
                const scoreB = (b.overallRating !== null && b.overallRating !== undefined) ? b.overallRating : 999;
                return scoreA - scoreB; 
            }
            return 0;
        });

        renderRouteReviews(sorted);
    };
}

function renderRouteReviews(reviewsArray) {
    const container = document.getElementById('crReviewsContainer');
    if (!container) return;

    if (reviewsArray.length === 0) {
        container.innerHTML = "<p>Bu kriterlere uygun yorum bulunamadı.</p>";
        return;
    }

    container.innerHTML = reviewsArray.map(r => {

        const puan = r.overallRating ?? 0;
        const yorum = escapeHtml(r.text ?? 'Yorum metni yok.');
        const yolcuAdi = escapeHtml(r.userName ?? 'Anonim Yolcu');
        const yildizGorseli = renderStars(puan);

        const dateOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };

        const seyahatTarihi = r.travelDate
            ? `📅 ${new Date(r.travelDate).toLocaleDateString('tr-TR', dateOptions)}`
            : '';

        const adminYanitiMetni = escapeHtml(r.adminReply || r.AdminReply);
        const adminYaniti = adminYanitiMetni
            ? `
                <div style="margin-top: 15px; padding: 12px; background-color: #f4f3fb; border-left: 4px solid #6c5ce7; border-radius: 4px;">
                    <strong style="color: #6c5ce7; font-size: 0.9rem;">
                        👑 Yönetici Yanıtı:
                    </strong>

                    <p style="margin: 5px 0 0 0; font-size: 0.95rem; color: #444; line-height: 1.5;">
                        ${adminYanitiMetni}
                    </p>
                </div>
            `
            : "";

        const renderCategory = (label, value) => {

            if (
                value === null ||
                value === undefined ||
                value === 0
            ) {
                return '';
            }

            return `
                <div style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">
                    <strong>${label}:</strong> ${value}/5
                </div>
            `;
        };

        const categoriesHtml = `
            ${renderCategory('Temizlik', r.cleanliness)}
            ${renderCategory('Konfor', r.comfort)}
            ${renderCategory('Dakiklik', r.punctuality)}
            ${renderCategory('Personel', r.staff)}
            ${renderCategory('İkram', r.catering)}
        `;

        const categorySection =
            categoriesHtml.trim().length > 0
                ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; font-size: 0.85rem; color: #475569;">
                        ${categoriesHtml}
                    </div>
                `
                : '';

        return `
        <div style="background: #f9f9f9; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #007bff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">

                <div style="font-weight: bold; color: #f39c12; font-size: 1.1rem;">
                    ${yildizGorseli} (${puan}/5) -

                    <span style="color:#555; font-size:1rem;">
                        ${yolcuAdi}
                    </span>
                </div>

                <span style="font-size: 0.85rem; color: #64748b;">
                    ${seyahatTarihi}
                </span>

            </div>

            <p style="margin: 0; color: #444; font-size: 1.05rem; line-height: 1.5;">
                ${yorum}
            </p>

            ${categorySection}

            ${adminYaniti}

        </div>
        `;

    }).join("");
}
// --- YORUM SIRALAMA VE EKRANA BASMA BİTİŞİ ---

// 7. Rotaları API'den Çekme
async function getRoutes() {
    // SADECE BU 2 SATIR EKLENDİ: Sayfada rota listesi alanı yoksa API'ye istek atma
    const container = document.getElementById("rota-listesi");
    if (!container) return; 

    try {
        const response = await fetch(`${API_BASE_URL}/Routes`);
        const routes = await response.json();
        allRoutesData = routes; 

        ekranaRotaYazdir(allRoutesData, 1); 

    } catch (error) {
        console.error("Rotalar çekilirken hata:", error);
    }
}

// 7.1 Rota Arama Motoru
function searchRoutes() {

    const searchInput =
        document.getElementById("routeSearchInput");

    if (!searchInput) return;

    const term =
        searchInput.value.toLowerCase().trim();

    const filteredRoutes =
        allRoutesData.filter(route => {

            const rotaAdi =
                (route.slug || route.Slug)
                    .replace(/-/g, ' ')
                    .toLowerCase();

            return rotaAdi.includes(term);
        });

    ekranaRotaYazdir(filteredRoutes, 1);
}

// 8. Rotaları Modern Grid Olarak ve SAYFALAMALI Ekrana Basma
function ekranaRotaYazdir(routes, page = 1) {

    const container =
        document.getElementById("rota-listesi");

    if (!container) return;

    currentRoutePage = page;

    if (routes.length === 0) {

        container.innerHTML =
            "<p class='empty-message' style='grid-column: 1 / -1; text-align: center; color: #64748b;'>Aradığınız şehre ait rota bulunamadı.</p>";

        const paginationDiv =
            document.getElementById("routePagination");

        if (paginationDiv) {
            paginationDiv.innerHTML = "";
        }

        return;
    }

    const totalPages =
        Math.ceil(routes.length / routesPerPage);

    const startIndex =
        (currentRoutePage - 1) * routesPerPage;

    const endIndex =
        startIndex + routesPerPage;

    const pagedRoutes =
        routes.slice(startIndex, endIndex);

    container.innerHTML =
        pagedRoutes.map(route => {

            const slug = route.slug || route.Slug;

            const rotaAdi =
                slug
                    .split('-')
                    .map(k =>
                        k.charAt(0).toUpperCase() +
                        k.slice(1)
                    )
                    .join(' ➔ ');

            return `
            <a href="rota.html?slug=${slug}" class="modern-route-card">

                <div class="route-left">

                    <div class="route-icon">
                        🛣️
                    </div>

                    <div class="route-info">
                        <h4>${escapeHtml(rotaAdi)}</h4>
                    </div>

                </div>

                <div class="route-arrow">
                    ➔
                </div>

            </a>
            `;

        }).join("");

    renderRoutePagination(totalPages);
}

// 8.1 Rota Sayfalama Butonları
function renderRoutePagination(totalPages) {

    const paginationDiv =
        document.getElementById("routePagination");

    if (!paginationDiv) return;

    if (totalPages <= 1) {
        paginationDiv.innerHTML = "";
        return;
    }

    let html = "";

    for (let i = 1; i <= totalPages; i++) {

        const activeClass =
            (i === currentRoutePage)
                ? 'active'
                : '';

        html += `
            <button onclick="changeRoutePage(${i})" class="page-btn ${activeClass}">
                ${i}
            </button>
        `;
    }

    paginationDiv.innerHTML = html;
}

// 8.2 Rota Sayfasını Değiştirme
function changeRoutePage(pageNumber) {

    const searchInput =
        document.getElementById("routeSearchInput");

    const term =
        searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

    let filteredRoutes = allRoutesData;

    if (term) {

        filteredRoutes =
            allRoutesData.filter(route => {

                const rotaAdi =
                    (route.slug || route.Slug)
                        .replace(/-/g, ' ')
                        .toLowerCase();

                return rotaAdi.includes(term);
            });
    }

    ekranaRotaYazdir(
        filteredRoutes,
        pageNumber
    );

    window.scrollTo({
        top: 150,
        behavior: 'smooth'
    });
}

// Firma karşılaştırma işlemleri için global değişkenler
let selectedCompaniesForCompare = [];
let currentRouteCompaniesData = [];

// 9. Rota Detaylarını Getirme ve Modern Kartları Doldurma
async function loadRouteDetails() {
    const routeNameElement = document.getElementById('routeName');
    const container = document.getElementById('route-companies-container');

    if (!routeNameElement) return;

    const slug = getSlugFromUrl();

    if (!slug) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Routes/${slug}`);

        if (!response.ok) {
            routeNameElement.innerText = "Rota Bulunamadı";
            return;
        }

        const route = await response.json();

        const rotaAdi = (route.slug || route.Slug)
            .split('-')
            .map(k => k.charAt(0).toUpperCase() + k.slice(1))
            .join(' ➔ ');

        routeNameElement.innerText = rotaAdi;

        // YENİ EKLENEN: Dinamik sayfa başlığı
        document.title = `${rotaAdi} Otobüs Firmaları | Otobüs Deneyimleri`;

        // YENİ EKLENEN: Dinamik meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = `${rotaAdi} güzergahındaki otobüs firmalarını, yolcu puanlarını ve seyahat deneyimlerini karşılaştırın.`;
        }

        if (container) {
            const compRes = await fetch(`${API_BASE_URL}/Routes/${slug}/companies`);
            
            // ... (Fonksiyonun geri kalanı tamamen aynı şekilde devam eder) ...

            const companies =
                await compRes.json();

            // 1. DEĞİŞİKLİK: Rota firmalarını karşılaştırma için globale kaydet
            currentRouteCompaniesData = companies;

            // Rota öne çıkanlarını hesapla ve çiz
            renderRouteHighlights(companies);

            const routeOverallRatingElement =
                document.getElementById('routeOverallRating');

            const routeReviewCountElement =
                document.getElementById('routeReviewCount');

            if (companies.length === 0) {

                container.innerHTML =
                    `<p class="empty-message" style="grid-column: 1 / -1; text-align: center;">
                        Yolcular henüz bu rota için bir firma değerlendirmesi yapmamış.
                    </p>`;

                if (routeOverallRatingElement) {
                    routeOverallRatingElement.innerText =
                        "⭐ - / 5";
                }

                if (routeReviewCountElement) {
                    routeReviewCountElement.innerText =
                        "0 değerlendirme";
                }

                return;
            }

            let totalRouteReviews =
                companies.reduce(
                    (sum, c) => sum + c.reviewCount,
                    0
                );

            let avgRouteRating =
                (
                    companies.reduce(
                        (sum, c) =>
                            sum +
                            (c.averageRating * c.reviewCount),
                        0
                    ) / totalRouteReviews
                ).toFixed(1);

            if (routeOverallRatingElement) {
                routeOverallRatingElement.innerText =
                    `⭐ ${avgRouteRating} / 5`;
            }

            if (routeReviewCountElement) {
                routeReviewCountElement.innerText =
                    `${totalRouteReviews} değerlendirme`;
            }

            container.innerHTML =
                companies.map(c => {

                    let statusColor =
                        c.dataStatus === "Yeterli Veri"
                            ? "#16a34a"
                            : c.dataStatus === "Sınırlı Veri"
                                ? "#d97706"
                                : "#64748b";

                    let statusBg =
                        c.dataStatus === "Yeterli Veri"
                            ? "#dcfce7"
                            : c.dataStatus === "Sınırlı Veri"
                                ? "#fef3c7"
                                : "#f1f5f9";

                    let statusIcon =
                        c.dataStatus === "Yeterli Veri"
                            ? "✓"
                            : c.dataStatus === "Sınırlı Veri"
                                ? "⚠"
                                : "ℹ";

                    // Kategori rozetleri hesaplaması
                    const catData = [
                        { label: 'Temizlik', icon: '🧼', val: c.averageCleanliness },
                        { label: 'Konfor', icon: '🛋️', val: c.averageComfort },
                        { label: 'Dakiklik', icon: '⏰', val: c.averagePunctuality },
                        { label: 'Personel', icon: '👤', val: c.averageStaff },
                        { label: 'İkram', icon: '🍽️', val: c.averageCatering }
                    ];

                    let badgesHtml = '';
                    catData.forEach(cat => {
                        if (cat.val !== null && cat.val !== undefined && cat.val > 0) {
                            badgesHtml += `
                                <div class="category-badge" title="${cat.label}">
                                    ${cat.icon} <span>${Number(cat.val).toFixed(1)}</span>
                                </div>`;
                        }
                    });

                    const categoriesSection = badgesHtml !== '' 
                        ? `<div class="route-card-categories">${badgesHtml}</div>`
                        : `<div style="font-size: 0.85rem; color: #64748b; margin: 12px 0;">Detaylı kategori verisi bekleniyor</div>`;

                    const safeCompanyName = escapeHtml(c.companyName);

                    return `
                    <a href="firma-rota.html?routeSlug=${slug}&companySlug=${c.companySlug}"
                       class="modern-company-card"
                       style="display: flex; flex-direction: column; gap: 12px; height: 100%;">

                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div class="card-left">
                                <img
                                    src="images/logos/${c.companySlug}.png"
                                    data-fallback="https://ui-avatars.com/api/?name=${encodeURIComponent(c.companyName)}&background=f1f5f9&color=64748b&rounded=true"
                                    onerror="this.onerror=null; this.src=this.dataset.fallback;"
                                    alt="${safeCompanyName}"
                                    class="company-logo"
                                >
                                <div class="company-info">
                                    <h4 style="margin-bottom: 2px;">
                                        ${safeCompanyName}
                                    </h4>
                                    <span style="font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 5px;">
                                        <strong style="color: #f39c12; font-size: 1rem;">
                                            ⭐ ${c.averageRating.toFixed(1)}
                                        </strong>
                                        / 5
                                        <span>
                                            (${c.reviewCount} değerlendirme)
                                        </span>
                                    </span>
                                </div>
                            </div>
                            
                            <!-- 2. DEĞİŞİKLİK: KARTIN SAĞ ÜST KÖŞESİNE KARŞILAŞTIRMA CHECKBOX EKLENDİ -->
                            <label onclick="event.stopPropagation();" style="cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.85rem; color: #475569; font-weight: 600; z-index: 10; padding-left: 10px;">
                                <input type="checkbox"
                                       value="${c.companySlug}"
                                       onchange="toggleCompanyCompare(event, '${c.companySlug}')"
                                       ${selectedCompaniesForCompare.includes(c.companySlug) ? 'checked' : ''}
                                       style="cursor: pointer; width: 16px; height: 16px;">
                                Karşılaştır
                            </label>
                        </div>

                        ${categoriesSection}

                        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: auto;">
                            <div style="background-color: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                                ${statusIcon} ${c.dataStatus}
                            </div>
                            <span style="color: #007bff; font-weight: 600; font-size: 0.9rem;">
                                İncele ➔
                            </span>
                        </div>

                    </a>
                    `;

                }).join("");
        }

    } catch (error) {

        console.error("Rota detayı çekilirken hata:", error);

        if (container) {
            container.innerHTML =
                `<p style="color:red; grid-column: 1 / -1;">
                    Sunucu bağlantı hatası oluştu.
                </p>`;
        }
    }
}

// =========================================================
// FİRMA KARŞILAŞTIRMA İŞLEMLERİ
// =========================================================

function toggleCompanyCompare(event, slug) {
    const isChecked = event.target.checked;
    
    if (isChecked) {
        if (selectedCompaniesForCompare.length >= 3) {
            alert("Maksimum 3 firmayı karşılaştırabilirsiniz.");
            event.target.checked = false; // Seçimi iptal et
            return;
        }
        selectedCompaniesForCompare.push(slug);
    } else {
        selectedCompaniesForCompare = selectedCompaniesForCompare.filter(s => s !== slug);
    }
    
    updateComparisonBar();
}

function updateComparisonBar() {
    const bar = document.getElementById("comparisonBar");
    const countSpan = document.getElementById("comparisonCount");
    const btn = document.getElementById("openComparisonButton");

    if (!bar || !countSpan || !btn) return;

    const count = selectedCompaniesForCompare.length;

    if (count === 0) {
        bar.style.display = "none";
        document.body.classList.remove("comparison-active");
    } else {
        bar.style.display = "block";
        document.body.classList.add("comparison-active");
        countSpan.innerText = `${count} Firma Seçildi`;

        if (count === 1) {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.onclick = null;
        } else {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            btn.onclick = openComparisonModal;
        }
    }
}

function openComparisonModal() {
    if (selectedCompaniesForCompare.length < 2) return;

    const modal = document.getElementById("comparisonModal");
    const container = document.getElementById("comparisonTableContainer");
    if (!modal || !container) return;

    // Sadece seçili firmaları bul (Yeni API isteği yapılmıyor)
    const companies = currentRouteCompaniesData.filter(c => selectedCompaniesForCompare.includes(c.companySlug));

    let tableHTML = `<table>
        <thead>
            <tr>
                <th>Özellik</th>
                ${companies.map(c => `<th>${escapeHtml(c.companyName)}</th>`).join("")}
            </tr>
        </thead>
        <tbody>
    `;

    // Karşılaştırılacak satırların konfigürasyonu
    const rows = [
        { label: 'Genel Puan', prop: 'averageRating', isScore: true },
        { label: 'Yorum Sayısı', prop: 'reviewCount', isScore: false },
        { label: 'Temizlik', prop: 'averageCleanliness', isScore: true },
        { label: 'Konfor', prop: 'averageComfort', isScore: true },
        { label: 'Dakiklik', prop: 'averagePunctuality', isScore: true },
        { label: 'Personel', prop: 'averageStaff', isScore: true },
        { label: 'İkram', prop: 'averageCatering', isScore: true }
    ];

    rows.forEach(row => {
        tableHTML += `<tr><td>${row.label}</td>`;

        // Skor tabanlıysa kazananı bulmak için en yüksek puanı hesapla
        let maxScore = -1;
        if (row.isScore) {
            companies.forEach(c => {
                const val = c[row.prop];
                if (val !== null && val !== undefined && val > 0 && val > maxScore) {
                    maxScore = val;
                }
            });
        }

        // Hücreleri bas
        companies.forEach(c => {
            const val = c[row.prop];
            let displayVal = "Veri yok";
            let isWinner = false;

            if (val !== null && val !== undefined) {
                if (row.isScore) {
                    if (val > 0) {
                        displayVal = `${Number(val).toFixed(1)} / 5`;
                        if (val === maxScore) isWinner = true; // Eşitlikte herkes kazanır
                    }
                } else {
                    // Yorum sayısı vb. metinler (kazananı yoktur)
                    displayVal = val;
                }
            }

            const tdClass = isWinner ? 'class="highlight-winner"' : '';
            tableHTML += `<td ${tdClass}>${displayVal}</td>`;
        });

        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
    modal.style.display = "flex";
}

function closeComparisonModal() {
    const modal = document.getElementById("comparisonModal");
    if (modal) modal.style.display = "none";
}

// Modal Kapatma Olay Dinleyicileri (Doğrudan bağlanır, çakışma yapmaz)
setTimeout(() => {
    const compModal = document.getElementById("comparisonModal");
    const compCloseBtn = document.getElementById("closeComparisonModal");
    
    if (compCloseBtn) compCloseBtn.addEventListener("click", closeComparisonModal);
    
    // Yalnızca modal overlay alanına (arka plandaki siyahlığa) tıklanınca kapat
    if (compModal) {
        compModal.addEventListener("click", (e) => {
            if (e.target === compModal) closeComparisonModal();
        });
    }
}, 500);

// --- ROTA ÖNE ÇIKANLARI (HIGHLIGHTS) ---
function renderRouteHighlights(companies) {
    const container = document.getElementById('routeHighlights');
    if (!container) return; 
    
    if (!companies || companies.length === 0) {
        container.innerHTML = '';
        return;
    }

    const categories = [
        { title: '🏆 En Yüksek Puan', prop: 'averageRating' },
        { title: '🛋️ En Konforlu', prop: 'averageComfort' },
        { title: '🧑‍💼 En İyi Personel', prop: 'averageStaff' },
        { title: '⏰ En Dakik', prop: 'averagePunctuality' },
        { title: '✨ En Temiz', prop: 'averageCleanliness' }
    ];

    let htmlContent = '';

    categories.forEach(cat => {
        let bestCompany = null;
        let maxScore = 0;

        companies.forEach(company => {
            const score = company[cat.prop];
            if (score !== null && score !== undefined && score > 0) {
                if (score > maxScore) {
                    maxScore = score;
                    bestCompany = company;
                }
            }
        });

        if (bestCompany) {
            htmlContent += `
                <div class="highlight-card">
                    <div class="highlight-category">${cat.title}</div>
                    <div class="highlight-company">${escapeHtml(bestCompany.companyName)}</div>
                    <div class="highlight-score">${maxScore.toFixed(1)} / 5</div>
                </div>
            `;
        }
    });

    container.innerHTML = htmlContent;
}

// 10. Değerlendirme Sayfası Seçenekleri
async function loadFormOptions() {

    const companySelect =
        document.getElementById('companySelect');

    const routeSelect =
        document.getElementById('routeSelect');

    if (!companySelect || !routeSelect) return;

    try {

        const compRes =
            await fetch(`${API_BASE_URL}/Companies`);

        const companies =
            await compRes.json();

        companySelect.innerHTML =
            '<option value="">Firma Seçin...</option>';

        companies.forEach(c => {

            companySelect.innerHTML += `
                <option value="${c.id || c.Id}">
                    ${escapeHtml(c.name || c.Name)}
                </option>
            `;
        });

        const routeRes =
            await fetch(`${API_BASE_URL}/Routes`);

        const routes =
            await routeRes.json();

        routeSelect.innerHTML =
            '<option value="">Rota Seçin...</option>';

        routes.forEach(r => {

            const rotaAdi =
                (r.slug || r.Slug)
                    .split('-')
                    .map(k =>
                        k.charAt(0).toUpperCase() +
                        k.slice(1)
                    )
                    .join(' - ');

            routeSelect.innerHTML += `
                <option value="${r.id || r.Id}">
                    ${escapeHtml(rotaAdi)}
                </option>
            `;
        });

    } catch (error) {

        console.error(
            "Form seçenekleri yüklenirken hata:",
            error
        );
    }
}

// 11. Form Gönderme
function setupReviewForm() {

    const reviewForm =
        document.getElementById('reviewForm');

    if (!reviewForm) return;

    const cleanInput =
        document.getElementById('cleanlinessInput');

    const comfortInput =
        document.getElementById('comfortInput');

    const puncInput =
        document.getElementById('punctualityInput');

    const staffInput =
        document.getElementById('staffInput');

    const cateringInput =
        document.getElementById('cateringInput');

    const ratingInput =
        document.getElementById('ratingInput');

    const categoryInputs = [
        cleanInput,
        comfortInput,
        puncInput,
        staffInput,
        cateringInput
    ];

    categoryInputs.forEach(input => {

        if (input) {

            input.addEventListener('change', () => {

                let total = 0;
                let allSelected = true;

                categoryInputs.forEach(sel => {

                    if (!sel.value) {
                        allSelected = false;
                    } else {
                        total += parseInt(sel.value);
                    }

                });

                if (allSelected) {

                    const average =
                        (total / 5).toFixed(1);

                    ratingInput.value = average;

                } else {

                    ratingInput.value = "";
                }

            });
        }
    });

   reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!ratingInput.value) {
            alert("Lütfen değerlendirmeyi göndermeden önce tüm kategoriler (Temizlik, Konfor vb.) için puan seçtiğinizden emin olun.");
            return;
        }

        const selectedDate = document.getElementById('travelDateInput').value;

        if (!selectedDate) {
            alert("Lütfen seyahat tarihinizi seçin.");
            return;
        }

        const reviewData = {
            companyId: parseInt(document.getElementById('companySelect').value),
            routeId: parseInt(document.getElementById('routeSelect').value),
            overallRating: parseFloat(ratingInput.value),
            cleanliness: parseFloat(cleanInput.value),
            comfort: parseFloat(comfortInput.value),
            punctuality: parseFloat(puncInput.value),
            staff: parseFloat(staffInput.value),
            catering: parseFloat(cateringInput.value),
            text: document.getElementById('commentInput').value,
            userName: localStorage.getItem("userName") || "Anonim Yolcu",
            travelDate: selectedDate 
        };

        // YENİ EKLENEN: Token kontrolü
        const token = localStorage.getItem("jwtToken");
        
        if (!token) {
            alert("Lütfen değerlendirme yapmak için giriş yapın.");
            return;
        }

        // BUTON KONTROLÜ BAŞLANGICI
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : "Değerlendirmeyi Gönder";
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Gönderiliyor...";
        }

        try {

            const response =
                await fetch(`${API_BASE_URL}/Reviews`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // YENİ EKLENEN: Güvenlik kilidi eklendi
                    },
                    body: JSON.stringify(reviewData)
                });

            if (response.ok) {

                alert(
                    "Değerlendirmeniz başarıyla gönderildi!"
                );

                reviewForm.reset();

            } else {

                alert(
                    "Değerlendirme gönderilirken bir hata oluştu."
                );
            }

        } catch (error) {

            console.error(
                "Yorum gönderilirken hata:",
                error
            );

            alert("Sunucuya bağlanılamadı.");
        } finally {
            // İŞLEM BİTİNCE BUTONU GERİ AÇ
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// 12. Dinamik Menü Yönetimi
function updateNavbar() {

    const authMenu =
        document.getElementById("dynamicAuthMenu");

    if (!authMenu) return;

    const userName =
        localStorage.getItem("userName");

    const userRole =
        localStorage.getItem("userRole");

    if (userName) {

        let adminBtn =
            userRole === "Admin"
                ? `<a href="admin.html" class="nav-admin-link">Admin Paneli</a>`
                : "";

        authMenu.innerHTML = `
            ${adminBtn}

            <a href="profil.html" class="nav-profile-link">
                👤 ${escapeHtml(userName)}
            </a>

            <button onclick="logout()" class="btn-logout">
                Çıkış Yap
            </button>
        `;

    } else {

        authMenu.innerHTML = `
            <a href="login.html" class="nav-login-link">
                Giriş Yap
            </a>
        `;
    }
}

// 13. Güvenli Çıkış İşlemi
function logout() {

    localStorage.removeItem("jwtToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");

    window.location.href = "index.html";
}
// JWT 401 Hata Yöneticisi
function handleUnauthorized(res) {
    if (res.status === 401) {
        alert("Oturum süreniz dolmuş, lütfen tekrar giriş yapın.");
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
        window.location.href = "login.html";
        return true;
    }
    return false;
}

// 14. Profil Sayfası ve Geçmiş Yorumları Yükleme
async function loadUserProfile() {

    const profileName =
        document.getElementById("profileName");

    const profileRole =
        document.getElementById("profileRole");

    const myReviewsList =
        document.getElementById("myReviewsList");

    if (!profileName || !myReviewsList) return;

    const userName =
        localStorage.getItem("userName");

    const userRole =
        localStorage.getItem("userRole");

    if (!userName) {

        window.location.href = "login.html";

        return;
    }

    profileName.innerText = userName;

    profileRole.innerText =
        userRole === "Admin"
            ? "Yönetici (Admin)"
            : "Standart Yolcu";

    try {

        // DEĞİŞİKLİK: Sadece giriş yapan kullanıcıya ait yorumlar çekiliyor.
        const response =
            await fetch(`${API_BASE_URL}/Reviews?userName=${encodeURIComponent(userName)}`);

        // DEĞİŞİKLİK: Frontend filter işlemi kaldırıldı, doğrudan json yanıtı kullanılıyor.
        const myReviews =
            await response.json();

        if (myReviews.length === 0) {

            myReviewsList.innerHTML =
                "<p class='text-center'>Henüz bir değerlendirme yapmadınız.</p>";

            return;
        }

        myReviews.sort(
            (a, b) =>
                (b.id || b.Id) -
                (a.id || a.Id)
        );

        myReviewsList.innerHTML =
            myReviews.map(r => {

                const puan =
                    r.overallRating ??
                    r.OverallRating ??
                    0;

                const yorum = escapeHtml(r.text ?? r.Text ?? 'Yorum metni yok.');

                const firmaHam =
                    (r.company &&
                        (r.company.name ||
                         r.company.Name))
                        ? (
                            r.company.name ||
                            r.company.Name
                        )
                        : "Firma Kaydı";
                        
                const firma = escapeHtml(firmaHam);

                const yildizGorseli =
                    renderStars(puan);

                return `
                <div style="background: #f9f9f9; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #f57c00; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">

                        <div style="font-weight: bold; font-size: 1.1rem; color: #333;">
                            ${firma}
                        </div>

                        <div style="color: #f39c12; font-weight: bold;">
                            ${yildizGorseli} (${puan}/5)
                        </div>

                    </div>

                    <p style="margin: 0; color: #444; line-height: 1.6; padding-bottom: 20px;">
                        ${yorum}
                    </p>

                    <button
                        onclick="deleteMyReview(${r.id || r.Id})"
                        class="btn-delete-small">
                        Sil
                    </button>

                </div>
                `;

            }).join("");

    } catch (error) {

        console.error(
            "Profil yorumları çekilirken hata:",
            error
        );

        myReviewsList.innerHTML =
            "<p class='text-center' style='color:red;'>Yorumlar yüklenemedi.</p>";
    }
}

// 15. Kullanıcının Kendi Yorumunu Silmesi
async function deleteMyReview(reviewId) {
    if (
        !confirm(
            "Bu değerlendirmenizi kalıcı olarak silmek istediğinize emin misiniz?"
        )
    ) return;

    const token =
        localStorage.getItem("jwtToken");

    if (!token) {
        alert(
            "Oturum süreniz dolmuş, lütfen tekrar giriş yapın."
        );
        return;
    }

    // BUTON KONTROLÜ BAŞLANGICI
    const btn = document.querySelector(`button[onclick="deleteMyReview(${reviewId})"]`);
    let originalText = "Sil";
    if (btn) {
        originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Siliniyor...";
    }

    try {
        const res =
            await fetch(
                `${API_BASE_URL}/Reviews/${reviewId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization':
                            `Bearer ${token}`
                    }
                }
            );

        // DEĞİŞİKLİK: 401 Kontrolü eklendi
        if (handleUnauthorized(res)) return;

        if (res.ok) {
            alert(
                "Yorumunuz başarıyla silindi."
            );
            loadUserProfile();
        } else {
            const errorText =
                await res.text();
            alert(
                "Silme işlemi reddedildi.\nDetay: " +
                errorText
            );
        }
    } catch (error) {
        console.error(
            "Silme hatası:",
            error
        );
    } finally {
        // İŞLEM BİTİNCE BUTONU GERİ AÇ
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// 16. Şifre Güncelleme İşlemi
function setupChangePasswordForm() {
    const form =
        document.getElementById(
            "changePasswordForm"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        async (e) => {
            e.preventDefault();

            const currentPassword =
                document.getElementById(
                    "currentPassword"
                ).value.trim();

            const newPassword =
                document.getElementById(
                    "newPassword"
                ).value.trim();

            const token =
                localStorage.getItem(
                    "jwtToken"
                );

            // BUTON KONTROLÜ BAŞLANGICI
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : "Şifreyi Güncelle";
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Değiştiriliyor...";
            }

            try {
                const res =
                    await fetch(
                        `${API_BASE_URL}/Auth/change-password`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json",
                                "Authorization":
                                    `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                currentPassword,
                                newPassword
                            })
                        }
                    );

                // DEĞİŞİKLİK: 401 Kontrolü eklendi
                if (handleUnauthorized(res)) return;

                if (res.ok) {
                    alert(
                        "Şifreniz başarıyla güncellendi! Güvenliğiniz için tekrar giriş yapmanız gerekiyor."
                    );
                    logout();
                } else {
                    const errorText =
                        await res.text();
                    alert(
                        "Hata: " +
                        errorText
                    );
                }
            } catch (error) {
                console.error(
                    "Şifre güncelleme hatası:",
                    error
                );
            } finally {
                // İŞLEM BİTİNCE BUTONU GERİ AÇ
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        }
    );
}

// 17. Şifre Formunu Göster/Gizle
function togglePasswordForm() {

    const pwdSection =
        document.getElementById(
            "hiddenPasswordSection"
        );

    if (pwdSection) {

        pwdSection.style.display =
            pwdSection.style.display === "none"
                ? "block"
                : "none";
    }
}

// 18. Çerez Kutusunu Kapatma
function acceptCookies() {

    const cookieBox =
        document.getElementById(
            "cookieConsent"
        );

    if (cookieBox) {

        cookieBox.style.display =
            "none";

        localStorage.setItem(
            "cookiesAccepted",
            "true"
        );
    }
}

// --- AKILLI ROTA ARAMA ---

// Türkçe karakterleri normalize eden ve slug oluşturan yardımcı fonksiyon
function generateRouteSlug(text) {
    if (!text) return "";
    
    // Türkçe karakter haritası (Önce dönüştürüp sonra küçülteceğiz)
    const trMap = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ı': 'i', 'I': 'i',
        'İ': 'i', 'i': 'i',
        'ö': 'o', 'Ö': 'o',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u'
    };
    
    let slug = text.trim();
    
    // 1. Türkçe karakterleri değiştir
    slug = slug.replace(/[çÇğĞıIİiöÖşŞüÜ]/g, match => trMap[match]);
    
    // 2. Küçük harfe çevir
    slug = slug.toLowerCase();
    
    // 3. Harf, rakam ve tire dışındaki tüm noktalama/özel karakterleri sil
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
    
    // 4. Boşlukları tireye çevir
    slug = slug.replace(/\s+/g, '-');
    
    // 5. Yan yana gelen birden fazla tireyi teke düşür ve baştaki/sondaki tireleri temizle
    slug = slug.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    
    return slug;
}

// Arama butonuna veya Enter'a basıldığında tetiklenen ana fonksiyon
async function smartRouteSearch() {
    const fromInput = document.getElementById("routeFrom");
    const toInput = document.getElementById("routeTo");
    const errorDiv = document.getElementById("smartSearchError");
    
    if (!fromInput || !toInput || !errorDiv) return;
    
    const fromVal = fromInput.value.trim();
    const toVal = toInput.value.trim();
    
    // Hata kutusunu sıfırla (XSS güvenliği için textContent kullanıyoruz)
    errorDiv.style.display = "none";
    errorDiv.textContent = "";
    
    // Boş alan validasyonları
    if (!fromVal) {
        errorDiv.textContent = "Lütfen kalkış noktasını (Nereden) giriniz.";
        errorDiv.style.display = "block";
        return;
    }
    
    if (!toVal) {
        errorDiv.textContent = "Lütfen varış noktasını (Nereye) giriniz.";
        errorDiv.style.display = "block";
        return;
    }
    
    // Slug'ları oluştur ve birleştir
    const fromSlug = generateRouteSlug(fromVal);
    const toSlug = generateRouteSlug(toVal);
    const combinedSlug = `${fromSlug}-${toSlug}`;
    
    // Spam tıklamayı önlemek için butonu geçici olarak devre dışı bırak
    const searchBtn = document.querySelector(".hero-search-box button[onclick='smartRouteSearch()']");
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = "Aranıyor...";
    }
    
    try {
        // Rota API'sini sorgula
        const response = await fetch(`${API_BASE_URL}/Routes/${combinedSlug}`);
        
        if (response.ok) {
            // Rota veritabanında bulundu, sayfaya yönlendir
            window.location.href = `rota.html?slug=${combinedSlug}`;
        } else if (response.status === 404) {
            // Rota bulunamadı
            errorDiv.textContent = "Bu rota için henüz yeterli veri bulunmuyor.";
            errorDiv.style.display = "block";
        } else {
            // 500 veya başka bir HTTP hatası
            errorDiv.textContent = "Rota aranırken bir hata oluştu. Lütfen tekrar deneyin.";
            errorDiv.style.display = "block";
        }
        
    } catch (error) {
        // Fetch hatası (Ağ hatası vb.)
        console.error("Akıllı rota arama hatası:", error);
        errorDiv.textContent = "Sunucu bağlantı hatası oluştu. Lütfen tekrar deneyin.";
        errorDiv.style.display = "block";
    } finally {
        // İşlem bitince butonu eski haline getir
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = "Rota Ara";
        }
    }
}
// --- AKILLI ROTA ARAMA BİTİŞİ ---

// YENİ EKLENEN: Tarayıcının geri/ileri butonları için URL State yönetimi
window.addEventListener("popstate", () => {
    if (document.getElementById("companyList")) {
        const params = new URLSearchParams(window.location.search);
        
        const p = parseInt(params.get('page')) || 1;
        currentSearch = params.get('search') || "";
        
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            searchInput.value = currentSearch;
        }
        
        // URL'yi tekrar değiştirmeden (false) veriyi çek
        getCompanies(p > 0 ? p : 1, false);
    }
});

// --- UYGULAMA BAŞLATICI ---
document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            localStorage.getItem(
                "cookiesAccepted"
            ) === "true"
        ) {

            const cookieBox =
                document.getElementById(
                    "cookieConsent"
                );

            if (cookieBox) {
                cookieBox.style.display =
                    "none";
            }
        }

        if (
            window.location.pathname.includes(
                "degerlendirme.html"
            ) &&
            !localStorage.getItem("userName")
        ) {

            alert(
                "Değerlendirme yapmak için önce giriş yapmalısınız."
            );

            window.location.href =
                "login.html";

            return;
        }

        // DEĞİŞEN BÖLÜM: Firma listesi açılırken URL'deki state değerlerini okuma
        if (document.getElementById("companyList")) {
            const params = new URLSearchParams(window.location.search);
            
            let initialPage = parseInt(params.get('page'));
            initialPage = (initialPage > 0) ? initialPage : 1;
            
            currentSearch = params.get('search') || "";
            
            const searchInput = document.getElementById("searchInput");
            if (searchInput) {
                searchInput.value = currentSearch;
            }
            
            getCompanies(initialPage, false); // Sayfa ilk açılışında pushState yapmaya gerek yok
        }

        loadCompanyDetails();
        getRoutes();
        loadRouteDetails();
        loadFormOptions();
        setupReviewForm();
        updateNavbar();
        loadUserProfile();
        setupChangePasswordForm();

        // Firma + rota detay yorumları
        loadRouteCompanyReviews();
    }
);
