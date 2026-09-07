const API_BASE_URL = "https://otobus-deneyimleri-production.up.railway.app/api";

// Global XSS Koruma Fonksiyonu
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getAuthHeaders() {
    const token = localStorage.getItem("jwtToken");
    return { 'Authorization': `Bearer ${token}` };
}

function handleAuthError(res) {
    if (res.status === 401) {
        alert("Oturum süreniz dolmuş, lütfen tekrar giriş yapın.");
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
        window.location.href = "login.html";
    } else if (res.status === 403) {
        alert("Yetkiniz yok! Lütfen admin hesabıyla giriş yapın.");
    }
}

// Global Veriler ve Sayfalama Ayarları
const itemsPerPage = 8;
let adminData = {
    reviews: [], currentReviewPage: 1,
    companies: [], currentCompanyPage: 1,
    routes: [], currentRoutePage: 1
};

// Modal Kontrolleri
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "flex";
}
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
}
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = "none";
    }
};

function openReplyModal(reviewId) {
    document.getElementById("replyReviewId").value = reviewId;
    document.getElementById("replyText").value = "";
    openModal("replyModal");
}

// Ana Veri Yükleme (Sadece sayfa ilk açıldığında çalışır)
async function loadAdminData() {
    try {
        // İstatistikler
        const statsRes = await fetch(`${API_BASE_URL}/Reviews/stats`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
          document.getElementById("statCompanies").innerText = stats.totalCompanies ?? stats.TotalCompanies ?? 0;
document.getElementById("statRoutes").innerText = stats.totalRoutes ?? stats.TotalRoutes ?? 0;
document.getElementById("statReviews").innerText = stats.totalReviews ?? stats.TotalReviews ?? 0;
document.getElementById("statRating").innerText = stats.averageRating ?? stats.AverageRating ?? 0;
        }

        // Yorumlar
        const reviewRes = await fetch(`${API_BASE_URL}/Reviews`);
        adminData.reviews = await reviewRes.json();
        adminData.reviews.sort((a, b) => (b.id || b.Id) - (a.id || a.Id));
        renderAdminReviews(1);

        // Firmalar
        const compRes = await fetch(`${API_BASE_URL}/Companies`);
        adminData.companies = await compRes.json();
        adminData.companies.sort((a, b) => (b.id || b.Id) - (a.id || a.Id));
        renderAdminCompanies(1);

        // Rotalar
        const routeRes = await fetch(`${API_BASE_URL}/Routes`);
        adminData.routes = await routeRes.json();
        adminData.routes.sort((a, b) => (b.id || b.Id) - (a.id || a.Id));
        renderAdminRoutes(1);

    } catch (error) {
        console.error("Veriler yüklenirken hata oluştu:", error);
    }
}

// Tablo Çizdirici ve Sayfalama Motorları
function renderAdminReviews(page) {
    adminData.currentReviewPage = page;
    const table = document.getElementById("adminReviewTable");
    const totalPages = Math.ceil(adminData.reviews.length / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const pagedData = adminData.reviews.slice(start, start + itemsPerPage);

    if (pagedData.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="text-center">Henüz yorum bulunmuyor.</td></tr>`;
    } else {
        table.innerHTML = pagedData.map(rev => {
            const safeText = escapeHtml((rev.text || rev.Text || '').substring(0, 50));
            
            return `
            <tr>
                <td>${rev.id || rev.Id}</td>
                <td>${safeText}...</td>
                <td><strong>${rev.overallRating || rev.OverallRating}/5</strong></td>
                <td>
                    ${rev.adminReply || rev.AdminReply 
                        ? '<span style="color:green; font-weight:bold; font-size:0.85rem; margin-right:10px;">✓ Yanıtlandı</span>' 
                        : `<button onclick="openReplyModal(${rev.id || rev.Id})" class="btn-add-badge" style="background:#f39c12; margin-right:5px;">Yanıtla</button>`}
                    <button onclick="deleteReview(${rev.id || rev.Id})" class="btn-danger">Sil</button>
                </td>
            </tr>
            `;
        }).join("");
    }
    renderPaginationBtns('adminReviewPagination', totalPages, page, 'renderAdminReviews');
}

function renderAdminCompanies(page) {
    adminData.currentCompanyPage = page;
    const table = document.getElementById("adminCompanyTable");
    const totalPages = Math.ceil(adminData.companies.length / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const pagedData = adminData.companies.slice(start, start + itemsPerPage);

    if (pagedData.length === 0) {
        table.innerHTML = `<tr><td colspan="4" class="text-center">Henüz firma bulunmuyor.</td></tr>`;
    } else {
        table.innerHTML = pagedData.map(c => {
            const safeName = escapeHtml(c.name || c.Name);
            const safeSlug = escapeHtml(c.slug || c.Slug);
            
            return `
            <tr>
                <td>${c.id || c.Id}</td>
                <td><strong>${safeName}</strong></td>
                <td>${safeSlug}</td>
                <td><button onclick="deleteCompany(${c.id || c.Id})" class="btn-danger">Sil</button></td>
            </tr>
            `;
        }).join("");
    }
    renderPaginationBtns('adminCompanyPagination', totalPages, page, 'renderAdminCompanies');
}

function renderAdminRoutes(page) {
    adminData.currentRoutePage = page;
    const table = document.getElementById("adminRouteTable");
    const totalPages = Math.ceil(adminData.routes.length / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const pagedData = adminData.routes.slice(start, start + itemsPerPage);

    if (pagedData.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="text-center">Henüz rota bulunmuyor.</td></tr>`;
    } else {
        table.innerHTML = pagedData.map(r => {
            const safeSlug = escapeHtml(r.slug || r.Slug);
            
            return `
            <tr>
                <td>${r.id || r.Id}</td>
                <td><strong>${safeSlug}</strong></td>
                <td><button onclick="deleteRoute(${r.id || r.Id})" class="btn-danger">Sil</button></td>
            </tr>
            `;
        }).join("");
    }
    renderPaginationBtns('adminRoutePagination', totalPages, page, 'renderAdminRoutes');
}

function renderPaginationBtns(containerId, totalPages, currentPage, callbackName) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if(container) container.innerHTML = "";
        return;
    }
    let html = "";
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = (i === currentPage) ? 'active' : '';
        html += `<button onclick="${callbackName}(${i})" class="page-btn ${activeClass}">${i}</button>`;
    }
    container.innerHTML = html;
}

// Silme İşlemleri (YENİ: Sadece İlgili Tablo ve State Güncellenir)
async function deleteReview(id) {
    if (!confirm("Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?")) return;
    
    const btn = document.querySelector(`button[onclick="deleteReview(${id})"]`);
    let originalText = "Sil";
    if (btn) {
        originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Siliniyor...";
    }

    try {
        const res = await fetch(`${API_BASE_URL}/Reviews/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (res.ok) { 
            adminData.reviews = adminData.reviews.filter(r => (r.id || r.Id) !== id);
            
            const statEl = document.getElementById("statReviews");
            if (statEl) statEl.innerText = Math.max(0, parseInt(statEl.innerText) - 1);
            
            const totalPages = Math.ceil(adminData.reviews.length / itemsPerPage);
            if (adminData.currentReviewPage > totalPages && adminData.currentReviewPage > 1) {
                adminData.currentReviewPage--;
            }
            
            renderAdminReviews(adminData.currentReviewPage);
        } else { 
            handleAuthError(res); 
        }
    } catch (error) { 
        console.error("Silme hatası:", error); 
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

async function deleteCompany(id) {
    if (!confirm("Bu firmayı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    
    const btn = document.querySelector(`button[onclick="deleteCompany(${id})"]`);
    let originalText = "Sil";
    if (btn) {
        originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Siliniyor...";
    }

    try {
        const res = await fetch(`${API_BASE_URL}/Companies/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (res.ok) { 
            adminData.companies = adminData.companies.filter(c => (c.id || c.Id) !== id);
            
            const statEl = document.getElementById("statCompanies");
            if (statEl) statEl.innerText = Math.max(0, parseInt(statEl.innerText) - 1);
            
            const totalPages = Math.ceil(adminData.companies.length / itemsPerPage);
            if (adminData.currentCompanyPage > totalPages && adminData.currentCompanyPage > 1) {
                adminData.currentCompanyPage--;
            }
            
            renderAdminCompanies(adminData.currentCompanyPage);
        } else { 
            handleAuthError(res); 
        }
    } catch (error) { 
        console.error("Silme hatası:", error); 
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

async function deleteRoute(id) {
    if (!confirm("Bu rotayı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    
    const btn = document.querySelector(`button[onclick="deleteRoute(${id})"]`);
    let originalText = "Sil";
    if (btn) {
        originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Siliniyor...";
    }

    try {
        const res = await fetch(`${API_BASE_URL}/Routes/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (res.ok) { 
            adminData.routes = adminData.routes.filter(r => (r.id || r.Id) !== id);
            
            const statEl = document.getElementById("statRoutes");
            if (statEl) statEl.innerText = Math.max(0, parseInt(statEl.innerText) - 1);
            
            const totalPages = Math.ceil(adminData.routes.length / itemsPerPage);
            if (adminData.currentRoutePage > totalPages && adminData.currentRoutePage > 1) {
                adminData.currentRoutePage--;
            }
            
            renderAdminRoutes(adminData.currentRoutePage);
        } else { 
            handleAuthError(res); 
        }
    } catch (error) { 
        console.error("Silme hatası:", error); 
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

// Form Kontrolleri (YENİ: Sadece İlgili Tablo ve State Güncellenir)
function setupAdminAddForms() {
    const addCompanyForm = document.getElementById("addCompanyForm");
    if (addCompanyForm) {
        addCompanyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("newCompanyName").value.trim();
            const slug = document.getElementById("newCompanySlug").value.trim();
            
            const submitBtn = addCompanyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : "Ekle";
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Ekleniyor...";
            }

            try {
                const res = await fetch(`${API_BASE_URL}/Companies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ name, slug })
                });
                if (res.ok) {
                    const newCompany = await res.json();
                    adminData.companies.unshift(newCompany);
                    
                    const statEl = document.getElementById("statCompanies");
                    if (statEl) statEl.innerText = parseInt(statEl.innerText) + 1;

                    alert(`${name} firması eklendi!`);
                    addCompanyForm.reset();
                    closeModal('companyModal');
                    renderAdminCompanies(1); 
                } else { handleAuthError(res); }
            } catch (error) { 
                console.error("Ekleme hatası:", error); 
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }

    const addRouteForm = document.getElementById("addRouteForm");
    if (addRouteForm) {
        addRouteForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const slug = document.getElementById("newRouteSlug").value.trim();
            
            const submitBtn = addRouteForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : "Ekle";
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Ekleniyor...";
            }

            try {
                const res = await fetch(`${API_BASE_URL}/Routes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ slug })
                });
                if (res.ok) {
                    const newRoute = await res.json();
                    adminData.routes.unshift(newRoute);
                    
                    const statEl = document.getElementById("statRoutes");
                    if (statEl) statEl.innerText = parseInt(statEl.innerText) + 1;

                    alert(`${slug} rotası eklendi!`);
                    addRouteForm.reset();
                    closeModal('routeModal');
                    renderAdminRoutes(1);
                } else { handleAuthError(res); }
            } catch (error) { 
                console.error("Ekleme hatası:", error); 
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }

    const replyForm = document.getElementById("replyForm");
    if (replyForm) {
        replyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const reviewId = document.getElementById("replyReviewId").value;
            const replyText = document.getElementById("replyText").value.trim();
            
            const submitBtn = replyForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.textContent : "Yanıtı Gönder";
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Gönderiliyor...";
            }

            try {
                const res = await fetch(`${API_BASE_URL}/Reviews/${reviewId}/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ replyText })
                });
                if (res.ok) {
                    const reviewIndex = adminData.reviews.findIndex(r => (r.id || r.Id) == reviewId);
                    if (reviewIndex !== -1) {
                        adminData.reviews[reviewIndex].adminReply = replyText;
                        adminData.reviews[reviewIndex].AdminReply = replyText;
                    }

                    alert("Yanıt yayınlandı!");
                    closeModal("replyModal");
                    renderAdminReviews(adminData.currentReviewPage); 
                } else { handleAuthError(res); }
            } catch (error) { 
                console.error("Yanıt hatası:", error); 
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
}

// Başlatıcı
document.addEventListener("DOMContentLoaded", () => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "Admin") {
        alert("Dikkat: Sadece yetkili yöneticiler bu sayfayı yönetebilir.");
        window.location.href = "index.html";
        return;
    }
    loadAdminData();
    setupAdminAddForms();
});
