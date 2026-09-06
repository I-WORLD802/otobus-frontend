using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtobusDeneyimleriAPI.Data;
using OtobusDeneyimleriAPI.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;

namespace OtobusDeneyimleriAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReviewsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviews([FromQuery] int? companyId, [FromQuery] string? userName)
        {
            var query = _context.Reviews
                .Include(r => r.Company)
                .Include(r => r.Route)
                .AsQueryable();

            if (companyId.HasValue)
            {
                query = query.Where(r => r.CompanyId == companyId.Value);
            }

            if (!string.IsNullOrWhiteSpace(userName))
            {
                query = query.Where(r => r.UserName == userName);
            }

            var reviews = await query.ToListAsync();
            return Ok(reviews);
        }

        // YENİ GÜVENLİ YORUM EKLEME METODU (SPAM KORUMALI)
        [HttpPost]
        [Authorize] 
        [EnableRateLimiting("ReviewLimit")] 
        public async Task<ActionResult<Review>> PostReview(Review review)
        {
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? "Bilinmeyen Yolcu";
            review.UserName = currentUserName;

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetReviews), new { id = review.Id }, review);
        }

        [Authorize]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null)
            {
                return NotFound("Silinecek yorum bulunamadı.");
            }

            var userRole = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;
            var currentUserName = User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name;

            bool isOwner = !string.IsNullOrEmpty(currentUserName) && 
                           string.Equals(review.UserName?.Trim(), currentUserName.Trim(), StringComparison.OrdinalIgnoreCase);

            if (userRole != "Admin" && !isOwner)
            {
                return StatusCode(403, $"Yorumun Sahibi: '{review.UserName}' | Token'daki Adın: '{currentUserName}'"); 
            }

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id:int}/reply")]
        public async Task<IActionResult> AddReply(int id, [FromBody] ReviewReplyDto dto)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null)
            {
                return NotFound("Yorum bulunamadı.");
            }

            review.AdminReply = dto.ReplyText;
            _context.Reviews.Update(review);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Yanıtınız başarıyla kaydedildi." });
        }

        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetStats()
        {
            var totalReviews = await _context.Reviews.CountAsync();
            var totalCompanies = await _context.Companies.CountAsync();
            var totalRoutes = await _context.Routes.CountAsync();
            
            double averageRating = 0;
            if (totalReviews > 0)
            {
                averageRating = await _context.Reviews.AverageAsync(r => r.OverallRating);
            }

            return Ok(new
            {
                TotalReviews = totalReviews,
                TotalCompanies = totalCompanies,
                TotalRoutes = totalRoutes,
                AverageRating = Math.Round(averageRating, 1)
            });
        }
    }

    public class ReviewReplyDto
    {
        public string ReplyText { get; set; } = string.Empty;
    }
}