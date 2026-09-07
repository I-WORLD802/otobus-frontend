   const API_BASE = "https://otobus-deneyimleri-production.up.railway.app/api";

// --- KAYIT İŞLEMİ ---
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dto = {
            fullName: document.getElementById("regFullName").value,
            email: document.getElementById("regEmail").value,
            password: document.getElementById("regPassword").value
        };

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : "Kayıt Ol";
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Kaydediliyor...";
        }

        try {
            const res = await fetch(`${AUTH_API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto)
            });

            if (res.ok) {
                alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
                registerForm.reset();
                toggleForms('login'); // Kayıt olunca otomatik giriş formuna geçir
            } else {
                const error = await res.text();
                alert("Hata: " + error);
            }
        } catch (error) {
            console.error("Kayıt hatası:", error);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// --- GİRİŞ İŞLEMİ ---
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dto = {
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value
        };

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : "Giriş Yap";
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Giriş Yapılıyor...";
        }

        try {
            const res = await fetch(`${AUTH_API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dto)
            });

            if (res.ok) {
                const data = await res.json();
                
                // Dijital kimliği tarayıcıya (localStorage) kaydet
                localStorage.setItem("jwtToken", data.token);
                localStorage.setItem("userName", data.fullName);
                localStorage.setItem("userRole", data.role);
                
                alert("Giriş başarılı! Hoş geldin, " + data.fullName);
                window.location.href = "index.html"; 
            } else {
                const error = await res.text();
                alert("Hata: " + error);
            }
        } catch (error) {
            console.error("Giriş hatası:", error);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}
