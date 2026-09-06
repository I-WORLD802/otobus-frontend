using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtobusDeneyimleriAPI.Data;
using OtobusDeneyimleriAPI.Models;

namespace OtobusDeneyimleriAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CompaniesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CompaniesController(AppDbContext context)
        {
            _context = context;
        }

        // GET işlemleri herkese açık (Vitrin için gerekli)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
        {
            var companies = await _context.Companies.ToListAsync();
            return Ok(companies);
        }

        [HttpGet("{slug}")]
        public async Task<ActionResult<Company>> GetCompanyBySlug(string slug)
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.Slug == slug);
            if (company == null) return NotFound();
            return Ok(company);
        }

       [HttpGet("paged")]
public async Task<ActionResult<object>> GetPagedCompanies([FromQuery] int page = 1, [FromQuery] string search = "")
{
    int pageSize = 9; 
    var query = _context.Companies.AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
    {
        query = query.Where(c => c.Name.ToLower().Contains(search.ToLower()));
    }

    var totalItems = await query.CountAsync();
    var totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

    var companiesRaw = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(c => new
        {
            Id = c.Id,
            Name = c.Name,
            Slug = c.Slug,
            ReviewCount = _context.Reviews.Count(r => r.CompanyId == c.Id),
            RawAverage = _context.Reviews.Where(r => r.CompanyId == c.Id).Average(r => (double?)r.OverallRating) ?? 0
        })
        .ToListAsync();

    var companies = companiesRaw.Select(c => new 
    {
        Id = c.Id,
        Name = c.Name,
        Slug = c.Slug,
        ReviewCount = c.ReviewCount,
        AverageRating = Math.Round(c.RawAverage, 1)
    });

    return Ok(new { TotalPages = totalPages, CurrentPage = page, Items = companies });
}

        // --- SADECE ADMİN YETKİSİ İSTEYEN İŞLEMLER ---
        
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<Company>> PostCompany(Company company)
        {
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetCompanies), new { id = company.Id }, company);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> PutCompany(int id, Company company)
        {
            if (id != company.Id) return BadRequest("URL'deki ID ile gönderilen ID uyuşmuyor.");
            _context.Entry(company).State = EntityState.Modified;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Companies.Any(e => e.Id == id)) return NotFound("Güncellenecek firma bulunamadı.");
                else throw;
            }
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteCompany(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound("Silinecek firma bulunamadı.");

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}