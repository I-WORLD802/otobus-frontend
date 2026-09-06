using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtobusDeneyimleriAPI.Data;
using OtobusDeneyimleriAPI.Models;
using Microsoft.AspNetCore.Authorization;

namespace OtobusDeneyimleriAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoutesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoutesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusRoute>>> GetRoutes()
        {
            var routes = await _context.Routes.ToListAsync();
            return Ok(routes);
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<BusRoute>> GetRouteBySlug(string slug)
        {
            var route = await _context.Routes.FirstOrDefaultAsync(r => r.Slug == slug);
            if (route == null)
            {
                return NotFound();
            }
            return Ok(route);
        }

        // --- YENİ EKLENEN ENDPOINT: Rota Bazlı Firma Karşılaştırma ---
        [HttpGet("{slug}/companies")]
        public async Task<IActionResult> GetCompaniesByRoute(string slug)
        {
            var routeReviews = await _context.Reviews
                .Include(r => r.Company)
                .Where(r => r.Route != null && r.Route.Slug == slug)
                .ToListAsync();

            if (!routeReviews.Any())
            {
                return Ok(new List<RouteCompanyComparisonDto>()); 
            }

            var groupedCompanies = routeReviews
                .Where(r => r.Company != null) 
                .GroupBy(r => r.Company)
                .Select(g => 
                {
                    var count = g.Count();
                    var average = g.Average(r => r.OverallRating); 
                    
                    // --- KATEGORİ ORTALAMALARINI GÜVENLİ HESAPLAMA ---
                    var validClean = g.Where(r => r.Cleanliness.HasValue && r.Cleanliness.Value >= 1).Select(r => r.Cleanliness.GetValueOrDefault());
                    double? avgClean = validClean.Any() ? Math.Round(validClean.Average(), 1) : null;

                    var validComfort = g.Where(r => r.Comfort.HasValue && r.Comfort.Value >= 1).Select(r => r.Comfort.GetValueOrDefault());
                    double? avgComfort = validComfort.Any() ? Math.Round(validComfort.Average(), 1) : null;

                    var validPunc = g.Where(r => r.Punctuality.HasValue && r.Punctuality.Value >= 1).Select(r => r.Punctuality.GetValueOrDefault());
                    double? avgPunc = validPunc.Any() ? Math.Round(validPunc.Average(), 1) : null;

                    var validStaff = g.Where(r => r.Staff.HasValue && r.Staff.Value >= 1).Select(r => r.Staff.GetValueOrDefault());
                    double? avgStaff = validStaff.Any() ? Math.Round(validStaff.Average(), 1) : null;

                    var validCatering = g.Where(r => r.Catering.HasValue && r.Catering.Value >= 1).Select(r => r.Catering.GetValueOrDefault());
                    double? avgCatering = validCatering.Any() ? Math.Round(validCatering.Average(), 1) : null;
                    
                    string dataStatus = "Az Veri";
                    int tier = 3; 

                    if (count >= 10)
                    {
                        dataStatus = "Yeterli Veri";
                        tier = 1; 
                    }
                    else if (count >= 3)
                    {
                        dataStatus = "Sınırlı Veri";
                        tier = 2; 
                    }

                    return new 
                    {
                        Dto = new RouteCompanyComparisonDto
                        {
                            CompanyName = g.Key!.Name,
                            CompanySlug = g.Key.Slug,
                            AverageRating = Math.Round(average, 1),
                            ReviewCount = count,
                            DataStatus = dataStatus,
                            // --- YENİ ALANLARI DTO'YA AKTARMA ---
                            AverageCleanliness = avgClean,
                            AverageComfort = avgComfort,
                            AveragePunctuality = avgPunc,
                            AverageStaff = avgStaff,
                            AverageCatering = avgCatering
                        },
                        Tier = tier
                    };
                })
                .OrderBy(x => x.Tier)
                .ThenByDescending(x => x.Dto.AverageRating)
                .Select(x => x.Dto)
                .ToList();

            return Ok(groupedCompanies);
        }

        // --- YENİ EKLENEN ENDPOINT: Belirli Rota ve Firmaya Ait Yorumlar ---
        [HttpGet("{routeSlug}/companies/{companySlug}/reviews")]
        public async Task<IActionResult> GetReviewsByRouteAndCompany(string routeSlug, string companySlug)
        {
            var targetRoute = await _context.Routes.FirstOrDefaultAsync(r => r.Slug == routeSlug);
            var targetCompany = await _context.Companies.FirstOrDefaultAsync(c => c.Slug == companySlug);

            if (targetRoute == null || targetCompany == null)
            {
                return NotFound("Geçerli bir rota veya firma bulunamadı.");
            }

            var reviews = await _context.Reviews
                .Include(r => r.Company)
                .Include(r => r.Route)
                .Where(r => r.RouteId == targetRoute.Id && r.CompanyId == targetCompany.Id)
                .OrderByDescending(r => r.Id)
                .ToListAsync();

            return Ok(reviews);
        }
        // -------------------------------------------------------------------

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<BusRoute>> PostRoute(BusRoute busRoute)
        {
            _context.Routes.Add(busRoute);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetRoutes), new { id = busRoute.Id }, busRoute);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> PutRoute(int id, BusRoute busRoute)
        {
            if (id != busRoute.Id)
            {
                return BadRequest("URL'deki ID ile gönderilen ID uyuşmuyor.");
            }

            _context.Entry(busRoute).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Routes.Any(e => e.Id == id))
                {
                    return NotFound("Güncellenecek rota bulunamadı.");
                }
                else
                {
                    throw;
                }
            }
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteRoute(int id)
        {
            var busRoute = await _context.Routes.FindAsync(id);
            if (busRoute == null)
            {
                return NotFound("Silinecek rota bulunamadı.");
            }

            _context.Routes.Remove(busRoute);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    // --- YENİ EKLENEN DTO SINIFI ---
    public class RouteCompanyComparisonDto
    {
        public string CompanyName { get; set; } = string.Empty;
        public string CompanySlug { get; set; } = string.Empty;
        public double AverageRating { get; set; }
        public int ReviewCount { get; set; }
        public string DataStatus { get; set; } = string.Empty;

        // --- YENİ EKLENEN KATEGORİ ORTALAMALARI ---
        public double? AverageCleanliness { get; set; }
        public double? AverageComfort { get; set; }
        public double? AveragePunctuality { get; set; }
        public double? AverageStaff { get; set; }
        public double? AverageCatering { get; set; }
    }
}