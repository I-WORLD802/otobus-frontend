using Microsoft.AspNetCore.Mvc;
using OtobusDeneyimleriAPI.Data;
using OtobusDeneyimleriAPI.Models;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;

namespace OtobusDeneyimleriAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScraperController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ScraperController(AppDbContext context)
        {
            _context = context;
        }

        [Authorize(Roles = "Admin")] // KİLİT EKLENDİ
        [HttpPost("scrape-companies")]
        public async Task<IActionResult> ScrapeCompanies()
        {
            var cleanCompanies = new List<string> 
            {
                "Kamil Koç", "Pamukkale Turizm", "Metro Turizm", "Ali Osman Ulusoy", "Varan Turizm",
                "Nilüfer Turizm", "Efe Tur", "Isparta Petrol", "Astor Turizm", "Buzlu Turizm",
                "Çanakkale Truva", "Dadaş Turizm", "Esadaş", "Has Turizm", "Kütahyalılar",
                "Lüks Karadeniz", "Öz Diyarbakır", "Rhodeus", "Seç Turizm", "Süha Turizm",
                "Şanal Kırşehir", "Tokat Seyahat", "Ulusoy", "Vangölü Turizm", "Yeni Aksaray",
                "As Adana", "Ben Turizm", "Best Van", "Cide Aslan", "Çorum Kargı",
                "Devran", "Fındıkkale", "Güney Akdeniz", "İnci Turizm", "Lider Adana", 
                "Lüks Mersin", "Nevşehir Seyahat", "Özlem Batman", "Ses Turizm", "Tatlıses Turizm"
            };

            int addedCount = 0;

            foreach (var companyName in cleanCompanies)
            {
                var slug = GenerateSlug(companyName);

                if (!_context.Companies.Any(c => c.Slug == slug))
                {
                    _context.Companies.Add(new Company
                    {
                        Name = companyName,
                        Slug = slug
                    });
                    addedCount++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"{addedCount} adet gerçek firma veritabanına başarıyla kaydedildi!" });
        }

        [Authorize(Roles = "Admin")] // KİLİT EKLENDİ
        [HttpPost("scrape-routes")]
        public async Task<IActionResult> ScrapeRoutes()
        {
            var popularRoutes = new List<string>
            {
                "İstanbul - Ankara", "İstanbul - İzmir", "Ankara - İzmir", "Bursa - İstanbul", 
                "Antalya - Ankara", "İzmir - Antalya", "Adana - İstanbul", "Trabzon - İstanbul",
                "Diyarbakır - İstanbul", "Gaziantep - Ankara", "Kayseri - İstanbul", "Eskişehir - Ankara",
                "Konya - İstanbul", "Samsun - Ankara", "Mersin - İstanbul", "Hatay - Ankara",
                "Malatya - İstanbul", "Erzurum - Ankara", "Sivas - İstanbul", "Van - Ankara",
                "Bursa - Ankara", "Bursa - İzmir", "Antalya - İstanbul", "Muğla - İstanbul",
                "Çanakkale - İstanbul", "Balıkesir - Ankara", "Aydın - İstanbul", "Denizli - İstanbul",
                "Sakarya - Ankara", "Kocaeli - İzmir", "Şanlıurfa - İstanbul", "Batman - Ankara"
            };

            int addedCount = 0;

            foreach (var routeName in popularRoutes)
            {
                var slug = GenerateSlug(routeName);

                if (!_context.Routes.Any(r => r.Slug == slug))
                {
                    _context.Routes.Add(new BusRoute
                    {
                        Slug = slug
                    });
                    addedCount++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { Message = $"{addedCount} adet popüler rota veritabanına başarıyla eklendi!" });
        }

      private string GenerateSlug(string text)
        {
            text = text.Replace("İ", "i").Replace("I", "ı");
            text = text.ToLowerInvariant();
            
            text = text.Replace("ı", "i").Replace("ğ", "g").Replace("ü", "u").Replace("ş", "s").Replace("ö", "o").Replace("ç", "c");
            text = Regex.Replace(text, @"[^a-z0-9\s-]", "");
            text = Regex.Replace(text, @"\s+", "-").Trim('-');
            
            text = Regex.Replace(text, @"-+", "-");
            
            return text;
        }
    }
}